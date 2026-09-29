import { readArchive } from '../burrito/archive';
import type { BurritoFiles } from '../burrito/files';
import { failureCodeOf, type FailureCode } from '../domain/failures';
import {
  packDirectory,
  packIdOf,
  packKindOf,
  packKinds,
  type PackId,
  type PackKind,
  type PackSourceKind,
  type ResourceRow,
} from '../domain/pack';
import { archiveUrlOf, refOf, resourceKey, type ReleaseRef } from '../domain/release';
import type { JournalEntry } from '../journal/entry';
import type { EventDraft } from '../journal/journal';
import type { HttpDownloaded, Ports } from '../ports';
import { validate } from '../burrito/validate';
import { checkBurrito, packRows, type CheckedBurrito } from './burrito';
import type { CatalogChoice, PackPlan, PackSource } from './source';
import { stagingDirectory, stagingPath, swapIn } from './swap';
import { bytesOf, copyBurrito, readBurrito, removeIfPresent, writeBurrito } from './tree';
import type { InstalledBurrito, InstalledPack, InstallOutcome, InstallProgress } from './types';
import { writeInstalledPack } from './store';

export const archiveTimeoutMs = 120_000;

const reportedSteps = 10;

type Opened = { ok: true; files: BurritoFiles } | { ok: false; code: FailureCode };

type Offer = {
  ref: ReleaseRef;
  row: ResourceRow | undefined;
  bytes: number | undefined;
  choice: CatalogChoice | undefined;
  open(stage: string, index: number, onBytes: (bytes: number) => void): Promise<Opened>;
};

export type Resolved = { kind: PackSourceKind; offers: readonly Offer[]; announce: boolean };

type Resolution = { ok: true; resolved: Resolved } | { ok: false; code: FailureCode };

type Target = { pack: PackId; kind: PackKind; language: string | undefined };

class InstallFailure extends Error {
  constructor(readonly failure: FailureCode) {
    super(failure);
  }
}

export type InstallerContext = {
  ports: Ports;
  emit(draft: EventDraft): Promise<JournalEntry | undefined>;
  installed(): ReadonlyMap<PackId, InstalledPack>;
  commit(pack: InstalledPack): void;
  progress: Map<string, InstallProgress>;
};

function downloadProblem(outcome: HttpDownloaded): FailureCode | undefined {
  switch (outcome.kind) {
    case 'offline':
      return 'http.offline';
    case 'timeout':
      return 'http.timeout';
    case 'refused':
      return 'http.host-refused';
    case 'response':
      return outcome.status >= 200 && outcome.status < 300 ? undefined : 'http.status';
  }
}

function opened(archive: Uint8Array): Opened {
  const read = readArchive(archive);
  return read.ok ? { ok: true, files: read.files } : { ok: false, code: 'pack.invalid-burrito' };
}

export function catalogOffer(ports: Ports, choice: CatalogChoice): Offer {
  return {
    ref: refOf(choice),
    row: choice.row,
    bytes: choice.bytes,
    choice,
    async open(stage, index, onBytes) {
      const to = `${stage}.archive-${index}.zip`;
      try {
        const outcome = await ports.http.download({
          url: archiveUrlOf(choice),
          to,
          timeoutMs: archiveTimeoutMs,
          onProgress: (received) => onBytes(received),
        });
        const problem = downloadProblem(outcome);
        if (problem !== undefined) {
          return { ok: false, code: problem };
        }
        return opened(await ports.files.readBytes(to));
      } finally {
        await removeIfPresent(ports.files, to);
      }
    },
  };
}

async function fileOffer(ports: Ports, path: string): Promise<Resolution> {
  let archive: Uint8Array;
  try {
    archive = await ports.files.readBytes(path);
  } catch (error) {
    return { ok: false, code: failureCodeOf(error) };
  }
  const read = opened(archive);
  if (!read.ok) {
    return read;
  }
  const checked = checkBurrito(read.files, undefined);
  if (!checked.ok) {
    return checked;
  }
  const { burrito } = checked;
  const offer: Offer = {
    ref: refOf(burrito.provenance),
    row: burrito.row,
    bytes: bytesOf(burrito.files),
    choice: undefined,
    open: async () => ({ ok: true, files: read.files }),
  };
  return { ok: true, resolved: { kind: 'file', offers: [offer], announce: true } };
}

export async function resolveSource(ports: Ports, source: PackSource): Promise<Resolution> {
  switch (source.kind) {
    case 'catalog':
      return {
        ok: true,
        resolved: {
          kind: 'catalog',
          offers: source.releases.map((choice) => catalogOffer(ports, choice)),
          announce: false,
        },
      };
    case 'peer': {
      const { session } = source;
      const offers = session.offered().map((burrito): Offer => ({
        ref: refOf(burrito),
        row: burrito.row,
        bytes: burrito.bytes,
        choice: undefined,
        async open(_stage, _index, onBytes) {
          const receipt = await session.receive(refOf(burrito), onBytes);
          return receipt.ok ? opened(receipt.archive) : receipt;
        },
      }));
      return { ok: true, resolved: { kind: 'peer', offers, announce: false } };
    }
    case 'file':
      return fileOffer(ports, source.path);
  }
}

export function targetOfPack(pack: PackId): Target | undefined {
  const [kindName, first] = pack.split(':');
  const kind = packKinds.find((item) => item === kindName);
  if (kind === undefined) {
    return undefined;
  }
  return { pack, kind, language: kind === 'image' ? undefined : first };
}

function targetOf(offers: readonly Offer[], plan: PackPlan): Target | FailureCode {
  if (plan.pack !== undefined) {
    return targetOfPack(plan.pack) ?? 'pack.mixed-packs';
  }
  const packs = new Set<PackId>();
  for (const offer of offers) {
    if (offer.row === undefined) {
      return 'pack.unknown-flavor';
    }
    const kind = packKindOf(offer.row, offer.ref.language);
    packs.add(packIdOf(kind, offer.ref.language, offer.ref.resource));
  }
  const [only] = [...packs];
  if (packs.size !== 1 || only === undefined) {
    return 'pack.mixed-packs';
  }
  return targetOfPack(only) ?? 'pack.mixed-packs';
}

function selected(offers: readonly Offer[], plan: PackPlan): Offer[] {
  if (plan.resources === undefined) {
    return [...offers];
  }
  const wanted = new Set(plan.resources.map(resourceKey));
  return offers.filter((offer) => wanted.has(resourceKey(offer.ref)));
}

function crossesStep(done: number, total: number): boolean {
  return Math.floor((done * reportedSteps) / total) > Math.floor(((done - 1) * reportedSteps) / total);
}

function installCodeOf(error: unknown): FailureCode {
  if (error instanceof InstallFailure) {
    return error.failure;
  }
  const code = failureCodeOf(error);
  return code === 'files.no-space' ? 'pack.no-space' : code;
}

function descriptorOf(burrito: InstalledBurrito) {
  const { provenance } = burrito;
  return {
    root: burrito.root,
    row: burrito.row,
    publisher: provenance.publisher,
    resource: provenance.resource,
    language: provenance.language,
    tag: provenance.tag,
    commit: provenance.commit,
    bytes: burrito.bytes,
  };
}

export type Installer = {
  prepare(resolved: Resolved, plan: PackPlan): Promise<InstallOutcome>;
};

export function createInstaller(context: InstallerContext): Installer {
  const { ports } = context;
  const { files } = ports;

  function accept(offer: Offer, target: Target, burrito: CheckedBurrito): void {
    const { provenance } = burrito;
    const kind = packKindOf(burrito.row, provenance.language);
    if (packIdOf(kind, provenance.language, provenance.resource) !== target.pack) {
      throw new InstallFailure('pack.mixed-packs');
    }
    if (resourceKey(provenance) !== resourceKey(offer.ref) || provenance.tag !== offer.ref.tag) {
      throw new InstallFailure('pack.invalid-burrito');
    }
  }

  async function verify(stage: string, burritos: readonly InstalledBurrito[]): Promise<void> {
    for (const burrito of burritos) {
      const { publisher, resource } = burrito.provenance;
      const report = validate(await readBurrito(files, `${stage}/${publisher}/${resource}`), {
        rows: packRows,
      });
      if (!report.ok) {
        throw new InstallFailure('pack.checksum-mismatch');
      }
    }
  }

  async function run(install: string, resolved: Resolved, offers: readonly Offer[], target: Target) {
    const stage = stagingPath(install);
    const root = packDirectory(target.pack);
    const existing = context.installed().get(target.pack);
    const replaced = new Set(offers.map((offer) => resourceKey(offer.ref)));
    const kept = (existing?.burritos ?? []).filter(
      (burrito) => !replaced.has(resourceKey(burrito.provenance)),
    );
    const progress: InstallProgress = {
      install,
      pack: target.pack,
      resources: 0,
      total: offers.length,
      bytes: 0,
    };
    context.progress.set(install, progress);
    const known = offers.every((offer) => offer.bytes !== undefined);
    const needed =
      offers.reduce((sum, offer) => sum + (offer.bytes ?? 0), 0) +
      kept.reduce((sum, item) => sum + item.bytes, 0);
    if (known && (await files.freeSpace()) < needed) {
      throw new InstallFailure('pack.no-space');
    }
    await files.mkdir(stage);
    for (const burrito of kept) {
      const { publisher, resource } = burrito.provenance;
      await copyBurrito(files, burrito.root, `${stage}/${publisher}/${resource}`);
    }
    const added: InstalledBurrito[] = [];
    for (const [index, offer] of offers.entries()) {
      const before = progress.bytes;
      const result = await offer.open(stage, index, (bytes) => {
        progress.bytes = before + bytes;
      });
      if (!result.ok) {
        throw new InstallFailure(result.code);
      }
      const checked = checkBurrito(result.files, offer.choice);
      if (!checked.ok) {
        throw new InstallFailure(checked.code);
      }
      accept(offer, target, checked.burrito);
      const { provenance } = checked.burrito;
      await writeBurrito(
        files,
        `${stage}/${provenance.publisher}/${provenance.resource}`,
        checked.burrito.files,
      );
      added.push({
        root: `${root}/${provenance.publisher}/${provenance.resource}`,
        row: checked.burrito.row,
        bytes: bytesOf(checked.burrito.files),
        released: checked.burrito.released,
        provenance,
      });
      progress.resources = index + 1;
      progress.bytes = before + bytesOf(result.files);
      if (crossesStep(progress.resources, progress.total)) {
        await context.emit({
          type: 'PackInstallProgressed',
          payload: { install, resources: progress.resources, total: progress.total, bytes: progress.bytes },
        });
      }
    }
    const burritos = [...kept, ...added].sort((left, right) =>
      resourceKey(left.provenance).localeCompare(resourceKey(right.provenance)),
    );
    await verify(stage, burritos);
    await swapIn(files, stage, target.pack);
    const pack: InstalledPack = {
      pack: target.pack,
      kind: target.kind,
      language: target.language,
      source: resolved.kind,
      bytes: burritos.reduce((sum, item) => sum + item.bytes, 0),
      burritos,
    };
    await ports.db.transaction((session) => writeInstalledPack(session, pack));
    context.commit(pack);
    return pack;
  }

  async function clearStaging(): Promise<void> {
    try {
      await removeIfPresent(files, stagingDirectory);
    } catch {
      return;
    }
  }

  async function prepare(resolved: Resolved, plan: PackPlan): Promise<InstallOutcome> {
    const offers = selected(resolved.offers, plan);
    const target = offers.length === 0 ? 'pack.empty-plan' : targetOf(offers, plan);
    if (typeof target === 'string') {
      await context.emit({ type: 'Failure', payload: { code: target, context: { step: 'install' } } });
      return { ok: false, install: undefined, pack: plan.pack, code: target };
    }
    const install = ports.ids.next();
    if (resolved.announce) {
      await context.emit({ type: 'ImportReceived', payload: { install } });
    }
    await context.emit({
      type: 'PackInstallStarted',
      payload: {
        install,
        pack: target.pack,
        kind: target.kind,
        source: resolved.kind,
        ...(target.language === undefined ? {} : { language: target.language }),
        releases: offers.map((offer) => offer.ref),
      },
    });
    try {
      const pack = await run(install, resolved, offers, target);
      await context.emit({
        type: 'PackInstalled',
        payload: {
          install,
          pack: pack.pack,
          kind: pack.kind,
          source: pack.source,
          ...(pack.language === undefined ? {} : { language: pack.language }),
          resources: pack.burritos.length,
          bytes: pack.bytes,
          burritos: pack.burritos.map(descriptorOf),
        },
      });
      await clearStaging();
      return { ok: true, install, pack };
    } catch (error) {
      const code = installCodeOf(error);
      await clearStaging();
      await context.emit({ type: 'PackFailed', payload: { install, pack: target.pack, code } });
      return { ok: false, install, pack: target.pack, code };
    } finally {
      context.progress.delete(install);
    }
  }

  return { prepare };
}
