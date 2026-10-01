import { md5Hex, utf8 } from '../burrito/files';
import { failureCodeOf, type FailureCode } from '../domain/failures';
import type { JournalEntry } from '../journal/entry';
import type { JsonValue } from '../json';
import { defineModule } from '../module';
import { removeIfPresent } from '../packs/tree';
import type { Peer } from '../ports';
import {
  acceptTimeoutMs,
  connectTimeoutMs,
  failTransfer,
  incomingDirectory,
  newActive,
  outgoingDirectory,
  quietly,
  receivedAppPath,
  statusOf,
  transferDirectory,
  type Active,
  type Run,
} from './active';
import { chunkBodyBytes, frameHeaderReserve } from './protocol';
import { chooseFrom, receiveAccepted, receivedDelivery } from './receiver';
import { appPackageOf, prepareOffer, sendAccepted, type Outgoing } from './sender';
import type {
  AcceptOutcome,
  IncomingOutcome,
  InstallAppOutcome,
  OfferOutcome,
  ReceivedApp,
  TransferCapabilities,
  TransferOutcome,
  TransferPlan,
  TransferResult,
  TransferSelection,
  TransferStatus,
} from './types';
import { createWire, TransferStop, type Wire } from './wire';

export type TransferApi = {
  capabilities(): Promise<TransferCapabilities>;
  offer(plan: TransferPlan): Promise<OfferOutcome>;
  run(transfer: string): Promise<TransferOutcome>;
  discover(): Promise<readonly Peer[]>;
  connect(peer: Peer): Promise<IncomingOutcome>;
  connectAt(address: string, code: string): Promise<IncomingOutcome>;
  accept(selection?: TransferSelection): Promise<AcceptOutcome>;
  decline(): Promise<void>;
  cancel(): Promise<void>;
  current(): TransferStatus | undefined;
  last(): TransferResult | undefined;
  receivedApp(): ReceivedApp | undefined;
  installApp(): Promise<InstallAppOutcome>;
};

const discoverTimeoutMs = 10 * 1000;

const maximumRefusals = 8;

export function pairingCode(transfer: string): string {
  const value = Number.parseInt(md5Hex(utf8(transfer)).slice(0, 8), 16) % 1_000_000;
  return String(value).padStart(6, '0');
}

function resultOf(entry: JournalEntry): TransferResult | undefined {
  switch (entry.type) {
    case 'TransferCompleted':
      return {
        role: entry.payload.role,
        outcome: 'completed',
        code: undefined,
        resources: entry.payload.resources,
        bytes: entry.payload.bytes,
      };
    case 'TransferFailed':
      return {
        role: entry.payload.role,
        outcome: 'failed',
        code: entry.payload.code,
        resources: 0,
        bytes: 0,
      };
    default:
      return undefined;
  }
}

function codeOfStop(active: Active, error: unknown): FailureCode {
  if (active.cancelled) {
    return 'transfer.cancelled';
  }
  return error instanceof TransferStop ? error.failure : failureCodeOf(error);
}

export const transferModule = defineModule<TransferApi>({
  events: [
    'TransferOffered',
    'TransferAccepted',
    'TransferProgressed',
    'TransferCompleted',
    'TransferFailed',
    'AppInstallerOpened',
  ],
  owns: { tables: [], directories: [transferDirectory], keys: [] },
  create(context) {
    const { ports } = context;
    let active: Active | undefined;
    let outgoing: Outgoing | undefined;
    let last: TransferResult | undefined;
    let receivedApp: ReceivedApp | undefined;
    let awaitingInstall = false;
    let peerInstall: string | undefined;

    const runOf = (current: Active): Run => ({ ports, emit: context.emit, active: current });

    async function refuse(code: FailureCode): Promise<{ ok: false; code: FailureCode }> {
      await context.emit({ type: 'Failure', payload: { code, context: { step: 'transfer' } } });
      return { ok: false, code };
    }

    async function usable(): Promise<FailureCode | undefined> {
      if (active !== undefined) {
        return 'transfer.unavailable';
      }
      if (chunkBodyBytes(ports.transport.maxChunkBytes()) < frameHeaderReserve) {
        return 'transfer.unsupported';
      }
      try {
        return (await ports.transport.available()) ? undefined : 'transfer.unavailable';
      } catch (error) {
        return failureCodeOf(error);
      }
    }

    async function settle(current: Active, error: unknown): Promise<FailureCode> {
      const code = codeOfStop(current, error);
      const wire = current.wire;
      if (wire !== undefined && error instanceof TransferStop && error.local && !current.cancelled) {
        await quietly(() => wire.send({ kind: 'error', code }));
      }
      const remote = wire === undefined || current.cancelled ? undefined : await drained(wire, error);
      await failTransfer(runOf(current), remote ?? code);
      return remote ?? code;
    }

    async function drained(wire: Wire, error: unknown): Promise<FailureCode | undefined> {
      if (error instanceof TransferStop) {
        return undefined;
      }
      let found: FailureCode | undefined;
      await quietly(() => wire.close());
      await quietly(async () => {
        found = await wire.drain();
      });
      return found;
    }

    async function finish(current: Active): Promise<void> {
      await quietly(async () => current.wire?.close());
      await quietly(async () => current.advertisement?.stop());
      await quietly(() => removeIfPresent(ports.files, outgoingDirectory));
      if (active === current) {
        active = undefined;
        outgoing = undefined;
      }
    }

    async function clearIncoming(): Promise<void> {
      awaitingInstall = false;
      peerInstall = undefined;
      await quietly(() => removeIfPresent(ports.files, incomingDirectory));
    }

    async function radiosOn(): Promise<boolean> {
      try {
        return await ports.transport.available();
      } catch {
        return false;
      }
    }

    async function capabilities(): Promise<TransferCapabilities> {
      return {
        available: await radiosOn(),
        platform: ports.transport.platform(),
        appPackage: (await appPackageOf(ports)).fact,
      };
    }

    async function offer(plan: TransferPlan): Promise<OfferOutcome> {
      const blocked = await usable();
      if (blocked !== undefined) {
        return refuse(blocked);
      }
      const prepared = await prepareOffer(ports, plan);
      if (!prepared.ok) {
        return refuse(prepared.code);
      }
      const current = newActive('sender', 'advertising', ports.transport.platform());
      const transfer = ports.ids.next();
      current.transfer = transfer;
      current.code = pairingCode(transfer);
      current.offer = prepared.offer;
      active = current;
      outgoing = prepared.outgoing;
      await context.emit({
        type: 'TransferOffered',
        payload: {
          transfer,
          ...(plan.language === undefined ? {} : { language: plan.language }),
          resources: prepared.offer.resources.length,
          bytes: prepared.offer.bytes,
          app: prepared.offer.app === undefined ? 'none' : 'included',
        },
      });
      try {
        current.advertisement = await ports.transport.advertise(current.code);
      } catch (error) {
        const code = failureCodeOf(error);
        await failTransfer(runOf(current), code);
        await finish(current);
        return { ok: false, code };
      }
      return {
        ok: true,
        transfer,
        code: current.code,
        address: current.advertisement.address,
        offer: prepared.offer,
      };
    }

    async function run(transfer: string): Promise<TransferOutcome> {
      const current = active;
      const plan = outgoing;
      if (
        current?.role !== 'sender' ||
        current.transfer !== transfer ||
        current.inFlight ||
        plan === undefined
      ) {
        return { ...(await refuse('transfer.unavailable')), transfer };
      }
      current.inFlight = true;
      const sending = runOf(current);
      try {
        const wire = await admitted(current);
        await quietly(async () => current.advertisement?.stop());
        await wire.send({ kind: 'hello', platform: current.platform });
        current.state = 'offering';
        const offered = current.offer;
        await wire.send({
          kind: 'offer',
          offer: { language: offered?.language, resources: offered?.resources ?? [], app: offered?.app },
        });
        const bytes = await sendAccepted(sending, wire, plan);
        return { ok: true, transfer, bytes };
      } catch (error) {
        return { ok: false, transfer, code: await settle(current, error) };
      } finally {
        await finish(current);
      }
    }

    async function admitted(current: Active): Promise<Wire> {
      for (let refusals = 0; ; refusals += 1) {
        if (refusals >= maximumRefusals) {
          throw new TransferStop('transfer.declined', false);
        }
        const link = current.cancelled ? undefined : await current.advertisement?.accept(acceptTimeoutMs);
        if (link === undefined) {
          throw new TransferStop('transfer.peer-lost', false);
        }
        const wire = createWire(link, ports.transport.maxChunkBytes());
        current.wire = wire;
        const refused = await provenBy(current, wire);
        if (refused === undefined) {
          return wire;
        }
        current.wire = undefined;
        await quietly(() => wire.close());
        await refuse(refused);
      }
    }

    async function provenBy(current: Active, wire: Wire): Promise<FailureCode | undefined> {
      try {
        const hello = await wire.expect('hello');
        if (hello.code !== undefined && hello.code === current.code) {
          current.peer = hello.platform;
          return undefined;
        }
        await quietly(() => wire.send({ kind: 'error', code: 'transfer.declined' }));
        return 'transfer.declined';
      } catch (error) {
        if (current.cancelled) {
          throw error;
        }
        return codeOfStop(current, error);
      }
    }

    async function discover(): Promise<readonly Peer[]> {
      try {
        return await ports.transport.discover(discoverTimeoutMs);
      } catch (error) {
        await refuse(failureCodeOf(error));
        return [];
      }
    }

    async function connect(peer: Peer): Promise<IncomingOutcome> {
      const blocked = await usable();
      if (blocked !== undefined) {
        return refuse(blocked);
      }
      const current = newActive('receiver', 'connected', ports.transport.platform());
      active = current;
      try {
        const wire = createWire(
          await ports.transport.connect(peer, connectTimeoutMs),
          ports.transport.maxChunkBytes(),
        );
        current.wire = wire;
        await wire.send({ kind: 'hello', platform: current.platform, code: peer.code });
        const hello = await wire.expect('hello');
        current.peer = hello.platform;
        const incoming = (await wire.expect('offer')).offer;
        const offered = {
          ...incoming,
          bytes: incoming.resources.reduce((sum, item) => sum + item.bytes, 0) + (incoming.app?.bytes ?? 0),
        };
        current.offer = offered;
        return { ok: true, platform: hello.platform, offer: offered };
      } catch (error) {
        const code = codeOfStop(current, error);
        await finish(current);
        return refuse(code);
      }
    }

    function connectAt(address: string, code: string): Promise<IncomingOutcome> {
      return connect({ id: address.trim(), code: code.trim(), platform: ports.transport.platform() });
    }

    async function installApp(): Promise<InstallAppOutcome> {
      if (ports.transport.platform() === 'ios') {
        return refuse('transfer.unsupported');
      }
      const app = receivedApp;
      try {
        if (app === undefined || !(await ports.files.exists(app.path))) {
          return await refuse('files.not-found');
        }
        await ports.transport.install(app.path);
        await context.emit({ type: 'AppInstallerOpened', payload: {} });
        return { ok: true };
      } catch (error) {
        return refuse(failureCodeOf(error));
      }
    }

    async function accept(selection: TransferSelection = {}): Promise<AcceptOutcome> {
      const current = active;
      const wire = current?.wire;
      if (
        current?.role !== 'receiver' ||
        current.inFlight ||
        wire === undefined ||
        current.offer === undefined
      ) {
        return { ...(await refuse('transfer.unavailable')), transfer: undefined };
      }
      const chosen = chooseFrom(current.offer, selection, current.platform);
      if (chosen.resources.length === 0 && !chosen.app) {
        await decline();
        return { ok: false, transfer: current.transfer, code: 'transfer.declined' };
      }
      current.inFlight = true;
      const transfer = ports.ids.next();
      current.transfer = transfer;
      const receiving = runOf(current);
      try {
        await context.emit({
          type: 'TransferAccepted',
          payload: {
            transfer,
            role: 'receiver',
            ...(current.offer.language === undefined ? {} : { language: current.offer.language }),
            resources: chosen.resources.length,
            app: chosen.app ? 'included' : 'none',
          },
        });
        const received = await receiveAccepted(receiving, wire, chosen);
        receivedApp = received.app ?? receivedApp;
        awaitingInstall = chosen.resources.length > 0;
        await context.emit({
          type: 'TransferCompleted',
          payload: {
            transfer,
            role: 'receiver',
            from: current.peer ?? current.platform,
            to: current.platform,
            resources: chosen.resources.length,
            bytes: current.total,
            app: chosen.app ? 'included' : 'none',
          },
        });
        const delivery = awaitingInstall
          ? receivedDelivery(ports, chosen.resources, received.archives)
          : undefined;
        return { ok: true, transfer, bytes: current.total, delivery, app: received.app };
      } catch (error) {
        const code = await settle(current, error);
        await clearIncoming();
        return { ok: false, transfer, code };
      } finally {
        await finish(current);
      }
    }

    async function decline(): Promise<void> {
      const current = active;
      if (current?.role !== 'receiver' || current.inFlight) {
        return;
      }
      await quietly(async () => current.wire?.send({ kind: 'accept', resources: [], app: false }));
      await failTransfer(runOf(current), 'transfer.declined');
      await finish(current);
    }

    async function cancel(): Promise<void> {
      const current = active;
      if (current === undefined) {
        return;
      }
      current.cancelled = true;
      const wire = current.wire;
      await quietly(async () => wire?.send({ kind: 'cancel' }));
      if (!current.inFlight) {
        await failTransfer(runOf(current), 'transfer.cancelled');
        await finish(current);
        return;
      }
      await quietly(async () => wire?.close());
      await quietly(async () => current.advertisement?.stop());
    }

    async function observe(entry: JournalEntry): Promise<void> {
      last = resultOf(entry) ?? last;
      if (!awaitingInstall) {
        return;
      }
      if (
        entry.type === 'PackInstallStarted' &&
        entry.payload.source === 'peer' &&
        peerInstall === undefined
      ) {
        peerInstall = entry.payload.install;
        return;
      }
      if (
        (entry.type === 'PackInstalled' || entry.type === 'PackFailed') &&
        entry.payload.install === peerInstall
      ) {
        await clearIncoming();
      }
    }

    function snapshot(): JsonValue {
      return {
        active:
          active === undefined
            ? null
            : {
                role: active.role,
                state: active.state,
                peer: active.peer ?? null,
                bytes: active.bytes,
                total: active.total,
              },
        last:
          last === undefined
            ? null
            : {
                role: last.role,
                outcome: last.outcome,
                code: last.code ?? null,
                resources: last.resources,
                bytes: last.bytes,
              },
        receivedApp: receivedApp === undefined ? null : { ...receivedApp },
      };
    }

    return {
      api: {
        capabilities,
        offer,
        run,
        discover,
        connect,
        connectAt,
        accept,
        decline,
        cancel,
        current: () => (active === undefined ? undefined : statusOf(active)),
        last: () => last,
        receivedApp: () => receivedApp,
        installApp,
      },
      async start() {
        await quietly(() => removeIfPresent(ports.files, incomingDirectory));
        await quietly(() => removeIfPresent(ports.files, outgoingDirectory));
        await quietly(async () => {
          if (await ports.files.exists(receivedAppPath)) {
            receivedApp = {
              path: receivedAppPath,
              bytes: await ports.files.size(receivedAppPath),
              state: 'ready-to-install',
            };
          }
        });
      },
      observe,
      snapshot,
    };
  },
});
