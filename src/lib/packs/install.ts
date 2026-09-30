import { compareText } from '../order';
import { metadataPath } from '../burrito/files';
import { unpackArchive, unpackedBytes } from '../burrito/unpack';
import type { BurritoFacts } from '../burrito/validate';
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
import { unrecordedCommit } from '../domain/provenance';
import { archiveUrlOf, refOf, resourceKey, type ReleaseRef } from '../domain/release';
import type { JournalEntry } from '../journal/entry';
import type { EventDraft } from '../journal/journal';
import type { ModulePorts } from '../module';
import type { HttpDownloaded } from '../ports';
import { checkBurrito, type CheckedBurrito } from './burrito';
import { buildAudioPack, buildImagePack, type BuiltDirectory } from './built';
import { isWordsBurrito, measuredBytes, restoreSharedPayload, shareWordsPayload } from './shared';
import {
  burritoRoot,
  collectGarbage,
  installDirectory,
  pruneEmpty,
  stagingDirectory,
  stagingPath,
} from './layout';
import type { CatalogChoice, PackPlan, PackSource } from './source';
import { parentOf, removeIfPresent } from './tree';
import type { InstalledBurrito, InstalledPack, InstallOutcome, InstallProgress } from './types';
import { writeInstalledPack } from './store';

const archiveTimeoutMs = 120_000;

const reportedSteps = 10;

type Fetched =
  { ok: true; path: string; temporary: boolean } | BuiltDirectory | { ok: false; code: FailureCode };

type Offer = {
  ref: ReleaseRef;
  revision?: string | undefined;
  row: ResourceRow | undefined;
  bytes: number | undefined;
  choice: CatalogChoice | undefined;
  fetch(stage: string, index: number, onBytes: (bytes: number) => void): Promise<Fetched>;
};

export type Resolved = {
  kind: PackSourceKind;
  offers: readonly Offer[];
  announce: boolean;
  replayed?: boolean;
};

type Resolution = { ok: true; resolved: Resolved } | { ok: false; code: FailureCode };

type Target = { pack: PackId; kind: PackKind; language: string | undefined };

class InstallFailure extends Error {
  constructor(
    readonly failure: FailureCode,
    readonly release?: ReleaseRef,
  ) {
    super(failure);
  }
}

export type FailedRelease = ReleaseRef & { code: FailureCode };

const requiredLanguageRows: readonly ResourceRow[] = ['text'];

const installWideFailures: readonly FailureCode[] = ['pack.no-space', 'files.no-space'];

function isRequired(offer: Offer, target: Target, resolved: Resolved): boolean {
  return (
    resolved.kind !== 'catalog' ||
    target.kind !== 'language' ||
    offer.row === undefined ||
    requiredLanguageRows.includes(offer.row)
  );
}

function requiredFirst(offers: readonly Offer[], target: Target, resolved: Resolved): Offer[] {
  const required = offers.filter((offer) => isRequired(offer, target, resolved));
  return [...required, ...offers.filter((offer) => !required.includes(offer))];
}

export type InstallerContext = {
  ports: ModulePorts;
  emit(draft: EventDraft): Promise<JournalEntry | undefined>;
  installed(): ReadonlyMap<PackId, InstalledPack>;
  commit(pack: InstalledPack): void;
  failed(pack: PackId, releases: readonly FailedRelease[]): void;
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
    case 'cancelled':
      return 'http.cancelled';
    case 'response':
      return outcome.status >= 200 && outcome.status < 300 ? undefined : 'http.status';
  }
}

function builtOffer(ports: ModulePorts, choice: CatalogChoice): Offer {
  const build = choice.built === 'images' ? buildImagePack : buildAudioPack;
  return {
    ref: refOf(choice),
    row: choice.row,
    bytes: choice.bytes,
    choice,
    fetch: (stage, index, onBytes) => build(ports, choice, `${stage}/${index}`, onBytes),
  };
}

export function catalogOffer(ports: ModulePorts, choice: CatalogChoice): Offer {
  if (choice.built !== undefined) {
    return builtOffer(ports, choice);
  }
  return {
    ref: refOf(choice),
    row: choice.row,
    bytes: choice.bytes,
    choice,
    async fetch(stage, index, onBytes) {
      const url = archiveUrlOf(choice);
      const path = `${stage}/${index}.zip`;
      const outcome = await ports.http.download({
        url,
        to: path,
        timeoutMs: archiveTimeoutMs,
        onProgress: (received) => onBytes(received),
      });
      const problem = downloadProblem(outcome);
      if (problem !== undefined) {
        await removeIfPresent(ports.files, path);
        return { ok: false, code: problem };
      }
      return { ok: true, path, temporary: true };
    },
  };
}

export type KnownReleases = () => Promise<readonly CatalogChoice[]>;

async function catalogMatch(
  known: KnownReleases,
  revision: string | undefined,
): Promise<CatalogChoice | undefined> {
  if (revision === undefined || revision === unrecordedCommit) {
    return undefined;
  }
  try {
    return (await known()).find((release) => release.commit === revision);
  } catch {
    return undefined;
  }
}

async function fileOffer(ports: ModulePorts, path: string, known: KnownReleases): Promise<Resolution> {
  let peeked: Awaited<ReturnType<typeof unpackArchive>>;
  try {
    peeked = await unpackArchive(ports.files, path, { hash: false });
  } catch (error) {
    return { ok: false, code: failureCodeOf(error) };
  }
  if (!peeked.ok) {
    return { ok: false, code: 'pack.invalid-burrito' };
  }
  const read = checkBurrito(peeked.facts, undefined, false);
  if (!read.ok) {
    return read;
  }
  const choice = await catalogMatch(known, read.burrito.revision);
  const checked = choice === undefined ? read : checkBurrito(peeked.facts, choice, false);
  if (!checked.ok) {
    return checked;
  }
  const { burrito } = checked;
  const offer: Offer = {
    ref: refOf(burrito.provenance),
    row: burrito.row,
    bytes: burrito.bytes,
    choice,
    fetch: async () => ({ ok: true, path, temporary: false }),
  };
  return { ok: true, resolved: { kind: 'file', offers: [offer], announce: true } };
}

export async function resolveSource(
  ports: ModulePorts,
  source: PackSource,
  known: KnownReleases,
): Promise<Resolution> {
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
      const { delivery } = source;
      const offers = delivery.offered().map((burrito): Offer => ({
        ref: refOf(burrito),
        revision: burrito.commit,
        row: burrito.row,
        bytes: burrito.bytes,
        choice: { ...refOf(burrito), row: burrito.row, bytes: burrito.bytes },
        async fetch(stage, index, onBytes) {
          const receipt = await delivery.receive(refOf(burrito), onBytes);
          if (!receipt.ok) {
            return receipt;
          }
          if ('path' in receipt) {
            return { ok: true, path: receipt.path, temporary: false };
          }
          const path = `${stage}/${index}.zip`;
          await ports.files.writeBytes(path, receipt.archive);
          return { ok: true, path, temporary: true };
        },
      }));
      return { ok: true, resolved: { kind: 'peer', offers, announce: false } };
    }
    case 'file':
      return fileOffer(ports, source.path, known);
  }
}

function targetOfPack(pack: PackId): Target | undefined {
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

async function quietly(work: () => Promise<void>): Promise<void> {
  try {
    await work();
  } catch {
    return;
  }
}

export type Installer = {
  prepare(resolved: Resolved, plan: PackPlan): Promise<InstallOutcome>;
};

type Written = { pack: InstalledPack; roots: readonly string[]; failed: readonly FailedRelease[] };

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
    const promised = offer.revision;
    if (promised !== undefined && promised !== unrecordedCommit && burrito.revision !== promised) {
      throw new InstallFailure('pack.invalid-burrito');
    }
  }

  async function unpackFetched(fetched: { path: string; temporary: boolean }, into: string) {
    const needed = await unpackedBytes(files, fetched.path);
    if (needed !== undefined && needed > (await files.freeSpace())) {
      throw new InstallFailure('pack.no-space');
    }
    const unpacked = await unpackArchive(files, fetched.path, { into });
    if (fetched.temporary) {
      await removeIfPresent(files, fetched.path);
    }
    if (!unpacked.ok || unpacked.directory === undefined) {
      throw new InstallFailure('pack.invalid-burrito');
    }
    return {
      ok: true as const,
      directory: unpacked.directory,
      facts: unpacked.facts,
      written: unpacked.written,
    };
  }

  async function verifyOnDisk(
    directory: string,
    burrito: CheckedBurrito,
    facts: BurritoFacts,
    written: readonly string[],
  ): Promise<void> {
    const listed = new Set([metadataPath, ...burrito.listed]);
    for (const path of written) {
      if (!listed.has(path)) {
        await files.remove(`${directory}/${path}`);
      }
    }
    for (const key of burrito.listed) {
      const expected = facts.fact(key);
      const path = `${directory}/${key}`;
      const size = (await files.exists(path)) ? await files.size(path) : undefined;
      if (expected === undefined || size !== expected.size) {
        throw new InstallFailure('pack.checksum-mismatch');
      }
    }
  }

  async function place(
    install: string,
    offer: Offer,
    target: Target,
    fetched: { path: string; temporary: boolean } | BuiltDirectory,
    index: number,
    stage: string,
  ): Promise<InstalledBurrito> {
    const unpacked = 'directory' in fetched ? fetched : await unpackFetched(fetched, `${stage}/${index}`);
    const checked = checkBurrito(unpacked.facts, offer.choice);
    if (!checked.ok) {
      throw new InstallFailure(checked.code);
    }
    accept(offer, target, checked.burrito);
    await verifyOnDisk(unpacked.directory, checked.burrito, unpacked.facts, unpacked.written);
    const { provenance } = checked.burrito;
    const root = burritoRoot(target.pack, install, provenance.publisher, provenance.resource);
    await files.mkdir(parentOf(root));
    await files.rename(unpacked.directory, root);
    return { root, row: checked.burrito.row, bytes: checked.burrito.bytes, provenance };
  }

  async function shareWords(
    kept: readonly InstalledBurrito[],
    added: readonly InstalledBurrito[],
  ): Promise<InstalledBurrito[]> {
    const combined = [...kept, ...added];
    const wordsRoots = combined.filter(isWordsBurrito).map((burrito) => burrito.root);
    const wordsChanged = added.some(isWordsBurrito);
    const result: InstalledBurrito[] = [];
    for (const burrito of combined) {
      const touched = burrito.row === 'wordLinks' && (wordsChanged || added.includes(burrito));
      if (!touched) {
        result.push(burrito);
        continue;
      }
      if (!added.includes(burrito)) {
        await restoreSharedPayload(files, burrito.root);
      }
      await shareWordsPayload(files, burrito.root, wordsRoots);
      result.push({ ...burrito, bytes: await measuredBytes(files, burrito.root) });
    }
    return result;
  }

  async function run(
    install: string,
    resolved: Resolved,
    offers: readonly Offer[],
    target: Target,
    placed: string[],
  ): Promise<Written> {
    const stage = stagingPath(install);
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
    const needed = offers.reduce((sum, offer) => sum + (offer.bytes ?? 0), 0);
    if (known && (await files.freeSpace()) < needed) {
      throw new InstallFailure('pack.no-space');
    }
    await files.mkdir(stage);
    const added: InstalledBurrito[] = [];
    const failed: FailedRelease[] = [];
    for (const [index, offer] of offers.entries()) {
      const before = progress.bytes;
      let burrito: InstalledBurrito;
      try {
        const fetched = await offer.fetch(stage, index, (bytes) => {
          progress.bytes = before + bytes;
        });
        if (!fetched.ok) {
          throw new InstallFailure(fetched.code);
        }
        burrito = await place(install, offer, target, fetched, index, stage);
      } catch (error) {
        const code = installCodeOf(error);
        if (isRequired(offer, target, resolved) || installWideFailures.includes(code)) {
          throw new InstallFailure(code, offer.ref);
        }
        const release = { ...refOf(offer.ref), code };
        failed.push(release);
        await context.emit({
          type: 'PackResourceFailed',
          payload: { install, pack: target.pack, ...release },
        });
        await quietly(() => removeIfPresent(files, `${stage}/${index}`));
        progress.resources = index + 1;
        progress.bytes = before;
        continue;
      }
      placed.push(burrito.root);
      added.push(burrito);
      progress.resources = index + 1;
      progress.bytes = before + burrito.bytes;
      if (crossesStep(progress.resources, progress.total)) {
        await context.emit({
          type: 'PackInstallProgressed',
          payload: { install, resources: progress.resources, total: progress.total, bytes: progress.bytes },
        });
      }
    }
    const [firstFailure] = failed;
    if (added.length === 0 && firstFailure !== undefined) {
      throw new InstallFailure(firstFailure.code, firstFailure);
    }
    const burritos = (await shareWords(kept, added)).sort((left, right) =>
      compareText(resourceKey(left.provenance), resourceKey(right.provenance)),
    );
    const pack: InstalledPack = {
      pack: target.pack,
      kind: target.kind,
      language: target.language,
      source: resolved.kind,
      bytes: burritos.reduce((sum, item) => sum + item.bytes, 0),
      burritos,
    };
    await ports.db.transaction((transaction) => writeInstalledPack(transaction, pack));
    context.commit(pack);
    return { pack, roots: burritos.map((burrito) => burrito.root), failed };
  }

  async function prepare(resolved: Resolved, plan: PackPlan): Promise<InstallOutcome> {
    const chosen = selected(resolved.offers, plan);
    const target = chosen.length === 0 ? 'pack.empty-plan' : targetOf(chosen, plan);
    if (typeof target === 'string') {
      await context.emit({ type: 'Failure', payload: { code: target, context: { step: 'install' } } });
      return { ok: false, install: undefined, pack: plan.pack, code: target };
    }
    const offers = resolved.replayed === true ? chosen : requiredFirst(chosen, target, resolved);
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
    const placed: string[] = [];
    let written: Written;
    try {
      written = await run(install, resolved, offers, target, placed);
    } catch (error) {
      const code = installCodeOf(error);
      const release = error instanceof InstallFailure ? error.release : undefined;
      await quietly(async () => {
        for (const root of placed) {
          await removeIfPresent(files, root);
        }
        await removeIfPresent(files, installDirectory(target.pack, install));
        await pruneEmpty(files, packDirectory(target.pack));
      });
      await quietly(() => removeIfPresent(files, stagingDirectory));
      await context.emit({
        type: 'PackFailed',
        payload: {
          install,
          pack: target.pack,
          code,
          ...(release === undefined
            ? {}
            : { publisher: release.publisher, resource: release.resource, tag: release.tag }),
        },
      });
      context.failed(target.pack, release === undefined ? [] : [{ ...refOf(release), code }]);
      context.progress.delete(install);
      return { ok: false, install, pack: target.pack, code };
    }
    context.progress.delete(install);
    await quietly(() => removeIfPresent(files, stagingDirectory));
    const { pack, roots, failed } = written;
    context.failed(pack.pack, failed);
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
        failed: failed.map((item) => ({ ...item })),
      },
    });
    await quietly(() => collectGarbage(files, packDirectory(pack.pack), roots));
    return { ok: true, install, pack };
  }

  return { prepare };
}
