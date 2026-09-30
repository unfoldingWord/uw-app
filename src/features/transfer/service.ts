import type { FailureCode } from '@lib/domain/failures';
import { languagePackId, type PackId } from '@lib/domain/pack';
import type { Kernel } from '@lib/kernel';
import { fromPeer } from '@lib/packs/source';
import type { DevicePlatform, Peer } from '@lib/ports';
import type { WireChoice, WireResource } from '@lib/transfer/protocol';
import type {
  IncomingOutcome,
  ReceivedApp,
  TransferResult,
  TransferRole,
  TransferState,
  TransferStatus,
} from '@lib/transfer/types';
import { qrMatrixOf, qrPathOf, transferLink, typedEntryOf, type QrMatrix } from './fallback';
import { transferWords, type TransferWords } from './strings';

export type Failed = { readonly ok: false; readonly code: FailureCode; readonly message: string };

export type AppPackageView =
  | {
      readonly state: 'available';
      readonly bytes: number;
      readonly size: string;
      readonly label: string;
      readonly about: string;
    }
  | { readonly state: 'ios-not-permitted'; readonly reason: string }
  | { readonly state: 'not-found'; readonly reason: string };

export type CapabilitiesView = {
  readonly available: boolean;
  readonly platform: DevicePlatform;
  readonly unavailable: string | undefined;
  readonly title: string;
  readonly overline: string;
  readonly note: string;
  readonly permission: string;
  readonly send: string;
  readonly receive: string;
  readonly app: AppPackageView;
};

export type ResourceChoice = {
  readonly publisher: string;
  readonly resource: string;
  readonly title: string;
  readonly bytes: number;
  readonly size: string;
  readonly label: string;
};

export type SendChoices =
  | { readonly state: 'nothing'; readonly message: string }
  | {
      readonly state: 'choices';
      readonly language: string;
      readonly autonym: string;
      readonly heading: string;
      readonly resources: readonly ResourceChoice[];
    };

export type SendPlan = {
  readonly language?: string;
  readonly resources?: readonly WireChoice[];
  readonly app?: boolean;
};

export type AddressFallback = {
  readonly address: string;
  readonly label: string;
  readonly network: string;
  readonly qr: QrMatrix;
  readonly qrPath: string;
  readonly qrLabel: string;
};

export type TypedView = {
  readonly open: string;
  readonly address: string;
  readonly code: string;
  readonly connect: string;
  readonly network: string;
};

export type InstallView = { readonly ok: true; readonly message: string } | Failed;

export type SelectionSummary = { readonly count: number; readonly bytes: number; readonly label: string };

export type OfferView =
  | {
      readonly ok: true;
      readonly transfer: string;
      readonly language: string | undefined;
      readonly resources: number;
      readonly app: boolean;
      readonly code: string;
      readonly codeLabel: string;
      readonly fallback: AddressFallback | undefined;
      readonly hint: string;
      readonly waiting: string;
      readonly bytes: number;
      readonly size: string;
      readonly stop: string;
    }
  | Failed;

export type SendResult =
  { readonly ok: true; readonly bytes: number; readonly messages: readonly string[] } | Failed;

export type PeerView = {
  readonly peer: Peer;
  readonly label: string;
  readonly codeLabel: string;
};

export type LookingView = { readonly title: string; readonly hint: string; readonly find: string };

export type IncomingAppView = { readonly bytes: number; readonly size: string; readonly label: string };

export type IncomingView =
  | {
      readonly ok: true;
      readonly platform: DevicePlatform;
      readonly language: string | undefined;
      readonly title: string;
      readonly size: string;
      readonly resources: readonly ResourceChoice[];
      readonly app: IncomingAppView | undefined;
      readonly accept: string;
      readonly decline: string;
    }
  | Failed;

export type Selection = { readonly resources?: readonly WireChoice[]; readonly app?: boolean };

export type ReceivedAppView = { readonly path: string; readonly bytes: number; readonly size: string };

export type ReceiveResult =
  | {
      readonly ok: true;
      readonly state: 'ready-to-read';
      readonly language: string;
      readonly pack: PackId;
      readonly label: string;
      readonly open: string;
      readonly app: ReceivedAppView | undefined;
    }
  | { readonly ok: true; readonly state: 'app-received'; readonly app: ReceivedAppView }
  | Failed;

export type StatusView = {
  readonly role: TransferRole;
  readonly state: TransferState;
  readonly peer: DevicePlatform | undefined;
  readonly bytes: number;
  readonly total: number;
  readonly percent: number;
  readonly label: string;
  readonly stop: string;
};

export type TransferService = {
  words(): TransferWords;
  capabilities(): Promise<CapabilitiesView>;
  choices(language?: string): SendChoices;
  summary(
    language: string | undefined,
    resources: readonly WireChoice[],
    appBytes?: number,
  ): SelectionSummary;
  offer(plan: SendPlan): Promise<OfferView>;
  send(offer: Extract<OfferView, { ok: true }>): Promise<SendResult>;
  looking(): LookingView;
  discover(): Promise<readonly PeerView[]>;
  connect(peer: Peer): Promise<IncomingView>;
  typed(): TypedView;
  connectTyped(address: string, code: string): Promise<IncomingView>;
  installApp(): Promise<InstallView>;
  installLabel(): string;
  accept(selection?: Selection): Promise<ReceiveResult>;
  decline(): Promise<void>;
  cancel(): Promise<void>;
  status(): StatusView | undefined;
  last(): TransferResult | undefined;
  receivedApp(): ReceivedAppView | undefined;
  open(language: string): Promise<boolean>;
};

function autonymOf(kernel: Kernel, language: string | undefined): string {
  if (language === undefined) {
    return '';
  }
  return kernel.catalog.languages().find((item) => item.language === language)?.autonym ?? language;
}

function percentOf(bytes: number, total: number): number {
  return total <= 0 ? 0 : Math.min(100, Math.floor((bytes / total) * 100));
}

function keyOf(item: WireChoice): string {
  return `${item.publisher}/${item.resource}`;
}

export function createTransferService(kernel: Kernel): TransferService {
  const words = (): TransferWords => transferWords(kernel);

  const failed = (code: FailureCode): Failed => ({ ok: false, code, message: words().t(`failure.${code}`) });

  const choiceOf = (
    current: TransferWords,
    item: Pick<WireResource, 'publisher' | 'resource' | 'title' | 'bytes'>,
  ): ResourceChoice => {
    const size = current.size(item.bytes);
    return {
      publisher: item.publisher,
      resource: item.resource,
      title: item.title,
      bytes: item.bytes,
      size,
      label: current.t('common.joined', { first: item.title, second: size }),
    };
  };

  const sendable = (language: string | undefined): readonly ResourceChoice[] => {
    if (language === undefined) {
      return [];
    }
    const current = words();
    const pack = kernel.packs.installed().find((item) => item.pack === languagePackId(language));
    return (pack?.burritos ?? []).map((burrito) =>
      choiceOf(current, {
        publisher: burrito.provenance.publisher,
        resource: burrito.provenance.resource,
        title: burrito.provenance.title,
        bytes: burrito.bytes,
      }),
    );
  };

  const fallbackOf = (current: TransferWords, address: string, code: string): AddressFallback | undefined => {
    const entry = typedEntryOf(address, code);
    if (entry === undefined) {
      return undefined;
    }
    const qr = qrMatrixOf(transferLink(entry));
    return {
      address: entry.address,
      label: current.t('transfer.address', { address: entry.address }),
      network: current.t('transfer.network'),
      qr,
      qrPath: qrPathOf(qr),
      qrLabel: current.t('transfer.address.qr', { address: entry.address }),
    };
  };

  const incomingOf = async (outcome: IncomingOutcome): Promise<IncomingView> => {
    if (!outcome.ok) {
      return failed(outcome.code);
    }
    const current = words();
    const { offer } = outcome;
    const { platform } = await kernel.transfer.capabilities();
    const app =
      offer.app !== undefined && platform === 'android'
        ? {
            bytes: offer.app.bytes,
            size: current.size(offer.app.bytes),
            label: current.t('transfer.app'),
          }
        : undefined;
    const count = offer.resources.length;
    return {
      ok: true,
      platform: outcome.platform,
      language: offer.language,
      title: current.t('transfer.offer.title', {
        language: autonymOf(kernel, offer.language),
      }),
      size: current.plural('transfer.offer.size', count, { size: current.size(offer.bytes) }),
      resources: offer.resources.map((item) => choiceOf(current, item)),
      app,
      accept: current.t('transfer.accept'),
      decline: current.t('transfer.decline'),
    };
  };

  const appView = (app: ReceivedApp): ReceivedAppView => ({
    path: app.path,
    bytes: app.bytes,
    size: words().size(app.bytes),
  });

  const statusView = (status: TransferStatus): StatusView => {
    const current = words();
    const percent = percentOf(status.bytes, status.total);
    const label =
      status.state === 'advertising' || status.state === 'offering'
        ? current.t('transfer.waiting')
        : status.role === 'sender'
          ? current.t('transfer.sending', { percent })
          : current.t('transfer.receiving', { percent });
    return {
      role: status.role,
      state: status.state,
      peer: status.peer,
      bytes: status.bytes,
      total: status.total,
      percent,
      label,
      stop: current.t('transfer.stop'),
    };
  };

  return {
    words,
    async capabilities() {
      const current = words();
      const facts = await kernel.transfer.capabilities();
      const app: AppPackageView = facts.appPackage.available
        ? {
            state: 'available',
            bytes: facts.appPackage.bytes,
            size: current.size(facts.appPackage.bytes),
            label: current.t('transfer.app'),
            about: current.t('transfer.app.about'),
          }
        : facts.appPackage.reason === 'ios-not-permitted'
          ? { state: 'ios-not-permitted', reason: current.t('transfer.app.ios') }
          : { state: 'not-found', reason: current.t('failure.transfer.unsupported') };
      return {
        available: facts.available,
        platform: facts.platform,
        unavailable: facts.available ? undefined : current.t('failure.transfer.unavailable'),
        title: current.t('transfer.title'),
        overline: current.t('transfer.overline'),
        note: current.t('transfer.note'),
        permission: current.t('transfer.permission'),
        send: current.t('transfer.send'),
        receive: current.t('transfer.receive'),
        app,
      };
    },
    choices(language = kernel.preferences.contentLanguage()) {
      const resources = sendable(language);
      if (language === undefined || resources.length === 0) {
        return { state: 'nothing', message: words().t('transfer.nothing') };
      }
      const autonym = autonymOf(kernel, language);
      return {
        state: 'choices',
        language,
        autonym,
        heading: words().t('transfer.choose', { language: autonym }),
        resources,
      };
    },
    summary(language, resources, appBytes = 0) {
      const current = words();
      const wanted = new Set(resources.map(keyOf));
      const chosen = sendable(language).filter((item) => wanted.has(keyOf(item)));
      const bytes = chosen.reduce((sum, item) => sum + item.bytes, 0) + appBytes;
      return {
        count: chosen.length,
        bytes,
        label: current.plural('transfer.selected', chosen.length, { size: current.size(bytes) }),
      };
    },
    async offer(plan) {
      const outcome = await kernel.transfer.offer({
        ...(plan.language === undefined ? {} : { language: plan.language }),
        ...(plan.resources === undefined ? {} : { resources: plan.resources }),
        ...(plan.app === undefined ? {} : { app: plan.app }),
      });
      if (!outcome.ok) {
        return failed(outcome.code);
      }
      const current = words();
      return {
        ok: true,
        transfer: outcome.transfer,
        language: outcome.offer.language,
        resources: outcome.offer.resources.length,
        app: outcome.offer.app !== undefined,
        code: outcome.code,
        codeLabel: current.t('transfer.code', { code: outcome.code }),
        fallback:
          outcome.address === undefined ? undefined : fallbackOf(current, outcome.address, outcome.code),
        hint: current.t('transfer.code.hint'),
        waiting: current.t('transfer.waiting'),
        bytes: outcome.offer.bytes,
        size: current.size(outcome.offer.bytes),
        stop: current.t('transfer.stop'),
      };
    },
    async send(offer) {
      const outcome = await kernel.transfer.run(offer.transfer);
      if (!outcome.ok) {
        return failed(outcome.code);
      }
      const current = words();
      const messages = [
        ...(offer.resources > 0
          ? [current.t('transfer.sent', { language: autonymOf(kernel, offer.language) })]
          : []),
        ...(offer.app ? [current.t('transfer.app.received')] : []),
      ];
      return { ok: true, bytes: outcome.bytes, messages };
    },
    looking() {
      const current = words();
      return {
        title: current.t('transfer.looking'),
        hint: current.t('transfer.looking.hint'),
        find: current.t('transfer.find'),
      };
    },
    async discover() {
      const current = words();
      return (await kernel.transfer.discover()).map((peer, index) => ({
        peer,
        label: current.t('transfer.peer', { number: index + 1 }),
        codeLabel: current.t('transfer.code', { code: peer.code }),
      }));
    },
    async connect(peer) {
      return incomingOf(await kernel.transfer.connect(peer));
    },
    typed() {
      const current = words();
      return {
        open: current.t('transfer.typed'),
        address: current.t('transfer.typed.address'),
        code: current.t('transfer.typed.code'),
        connect: current.t('transfer.typed.connect'),
        network: current.t('transfer.network'),
      };
    },
    async connectTyped(address, code) {
      const entry = typedEntryOf(address, code);
      if (entry === undefined) {
        return { ok: false, code: 'transfer.peer-lost', message: words().t('transfer.typed.invalid') };
      }
      return incomingOf(await kernel.transfer.connectAt(entry.address, entry.code));
    },
    async installApp() {
      const outcome = await kernel.transfer.installApp();
      const current = words();
      if (outcome.ok) {
        return { ok: true, message: current.t('transfer.app.install.opened') };
      }
      const message =
        outcome.code === 'transfer.unsupported'
          ? current.t('transfer.app.install.unsupported')
          : current.t(`failure.${outcome.code}`);
      return { ok: false, code: outcome.code, message };
    },
    installLabel: () => words().t('transfer.app.install'),
    async accept(selection = {}) {
      const accepted = await kernel.transfer.accept({
        ...(selection.resources === undefined ? {} : { resources: selection.resources }),
        ...(selection.app === undefined ? {} : { app: selection.app }),
      });
      if (!accepted.ok) {
        return failed(accepted.code);
      }
      const app = accepted.app === undefined ? undefined : appView(accepted.app);
      if (accepted.session === undefined) {
        return app === undefined ? failed('transfer.declined') : { ok: true, state: 'app-received', app };
      }
      const installed = await kernel.packs.install(fromPeer(accepted.session));
      if (!installed.ok) {
        return failed(installed.code);
      }
      const language = installed.pack.language ?? '';
      const current = words();
      const autonym = autonymOf(kernel, language);
      return {
        ok: true,
        state: 'ready-to-read',
        language,
        pack: installed.pack.pack,
        label: current.t('transfer.received', { language: autonym }),
        open: current.t('transfer.openLanguage', { language: autonym }),
        app,
      };
    },
    decline: () => kernel.transfer.decline(),
    cancel: () => kernel.transfer.cancel(),
    status() {
      const status = kernel.transfer.current();
      return status === undefined ? undefined : statusView(status);
    },
    last: () => kernel.transfer.last(),
    receivedApp() {
      const app = kernel.transfer.receivedApp();
      return app === undefined ? undefined : appView(app);
    },
    open: (language) => kernel.preferences.set('study.language', language),
  };
}
