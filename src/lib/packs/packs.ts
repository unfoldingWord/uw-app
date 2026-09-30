import { compareText } from '../order';
import { readCatalogReleases } from '../catalog/store';
import type { CatalogRelease } from '../catalog/types';
import { failureCodeOf } from '../domain/failures';
import { languagePackId, packDirectory, packsDirectory, type PackId, type ResourceRow } from '../domain/pack';
import { refOf, resourceKey, type ReleaseRef } from '../domain/release';
import { defineModule } from '../module';
import type { PickedFile } from '../ports';
import { catalogOffer, createInstaller, resolveSource, type FailedRelease, type Resolved } from './install';
import { defaultReleases, missingReleases, optionalReleases, updatesOf } from './plan';
import { fromCatalog, fromFile, type PackPlan, type PackSource } from './source';
import { deleteInstalledPack, packTables, readInstalledPacks } from './store';
import { inboxDirectory, recoverPacks } from './layout';
import { removeIfPresent } from './tree';
import type {
  InstalledBurrito,
  InstalledPack,
  InstallOutcome,
  InstallProgress,
  PackUpdate,
  RemoveOutcome,
  ResourceUpdate,
  Storage,
} from './types';

export type LanguageStatus = {
  language: string;
  pack: PackId;
  installed: readonly InstalledBurrito[];
  missing: readonly CatalogRelease[];
  updates: readonly ResourceUpdate[];
  failed: readonly FailedRelease[];
  complete: boolean;
};

export type CatalogInstallOptions = { withRows?: readonly ResourceRow[] };

export type PacksApi = {
  install(source: PackSource, plan?: PackPlan): Promise<InstallOutcome>;
  importFile(external: string): Promise<InstallOutcome>;
  importPicked(): Promise<InstallOutcome | undefined>;
  installFromCatalog(pack: PackId, options?: CatalogInstallOptions): Promise<InstallOutcome>;
  update(pack: PackId): Promise<InstallOutcome>;
  remove(pack: PackId): Promise<RemoveOutcome>;
  installed(): readonly InstalledPack[];
  installing(): readonly InstallProgress[];
  updates(): Promise<readonly PackUpdate[]>;
  status(language: string): Promise<LanguageStatus>;
  storage(): Promise<Storage>;
  defaults(pack: PackId): Promise<readonly CatalogRelease[]>;
  optional(pack: PackId): Promise<readonly CatalogRelease[]>;
  installOptional(
    pack: PackId,
    release: Pick<CatalogRelease, 'publisher' | 'resource'>,
  ): Promise<InstallOutcome>;
};

function chosenOptional(
  releases: readonly CatalogRelease[],
  pack: PackId,
  current: InstalledPack | undefined,
  rows: readonly ResourceRow[],
): CatalogRelease[] {
  const present = new Set((current?.burritos ?? []).map((burrito) => burrito.provenance.resource));
  const chosen = new Map<string, CatalogRelease>();
  for (const release of optionalReleases(releases, pack)) {
    const wanted = release.row !== undefined && rows.includes(release.row);
    if (wanted && !present.has(release.resource) && !chosen.has(release.resource)) {
      chosen.set(release.resource, release);
    }
  }
  return [...chosen.values()];
}

export const packsModule = defineModule<PacksApi>({
  events: [
    'PackInstallStarted',
    'PackInstallProgressed',
    'PackInstalled',
    'PackFailed',
    'PackRemoved',
    'ImportReceived',
  ],
  owns: { tables: packTables, directories: [packsDirectory], keys: [] },
  create(context) {
    const { ports } = context;
    const installed = new Map<PackId, InstalledPack>();
    const progress = new Map<string, InstallProgress>();
    const failures = new Map<PackId, readonly FailedRelease[]>();
    let queue: Promise<unknown> = Promise.resolve();

    function serial<T>(work: () => Promise<T>): Promise<T> {
      const next = queue.then(work, work);
      queue = next.catch(() => undefined);
      return next;
    }

    const installer = createInstaller({
      ports,
      emit: context.emit,
      installed: () => installed,
      commit: (pack) => {
        installed.set(pack.pack, pack);
      },
      failed: (pack, releases) => {
        const present = new Set(
          (installed.get(pack)?.burritos ?? []).map((burrito) => resourceKey(burrito.provenance)),
        );
        const kept = (failures.get(pack) ?? []).filter(
          (item) =>
            !present.has(resourceKey(item)) &&
            !releases.some((release) => resourceKey(release) === resourceKey(item)),
        );
        const next = [...kept, ...releases].filter((item) => !present.has(resourceKey(item)));
        if (next.length === 0) {
          failures.delete(pack);
        } else {
          failures.set(pack, next);
        }
      },
      progress,
    });

    const sortedPacks = (): InstalledPack[] =>
      [...installed.values()].sort((left, right) => compareText(left.pack, right.pack));

    const catalogReleases = (): Promise<CatalogRelease[]> => readCatalogReleases(ports.db);

    async function installNow(source: PackSource, plan: PackPlan): Promise<InstallOutcome> {
      const resolution = await resolveSource(ports, source, catalogReleases);
      if (!resolution.ok) {
        await context.emit({
          type: 'Failure',
          payload: { code: resolution.code, context: { step: source.kind } },
        });
        return { ok: false, install: undefined, pack: plan.pack, code: resolution.code };
      }
      return installer.prepare(resolution.resolved, plan);
    }

    function install(source: PackSource, plan: PackPlan = {}): Promise<InstallOutcome> {
      return serial(() => installNow(source, plan));
    }

    function importFile(external: string): Promise<InstallOutcome> {
      const path = `${inboxDirectory}/import.zip`;
      return serial(async () => {
        try {
          await removeIfPresent(ports.files, inboxDirectory);
          await ports.files.mkdir(inboxDirectory);
          await ports.files.adopt(external, path);
        } catch (error) {
          const code = failureCodeOf(error);
          await context.emit({ type: 'Failure', payload: { code, context: { step: 'file' } } });
          return { ok: false, install: undefined, pack: undefined, code };
        }
        try {
          return await installNow(fromFile(path), {});
        } finally {
          await removeIfPresent(ports.files, inboxDirectory);
        }
      });
    }

    async function importPicked(): Promise<InstallOutcome | undefined> {
      let picked: PickedFile | undefined;
      try {
        picked = await ports.picker.pickArchive();
      } catch (error) {
        const code = failureCodeOf(error);
        await context.emit({ type: 'Failure', payload: { code, context: { step: 'file' } } });
        return { ok: false, install: undefined, pack: undefined, code };
      }
      return picked === undefined ? undefined : importFile(picked.uri);
    }

    function installFromCatalog(pack: PackId, options: CatalogInstallOptions = {}): Promise<InstallOutcome> {
      return serial(async () => {
        const current = installed.get(pack);
        const releases = await catalogReleases();
        const missing = [
          ...missingReleases(releases, pack, current),
          ...chosenOptional(releases, pack, current, options.withRows ?? []),
        ];
        if (missing.length === 0 && current !== undefined) {
          return { ok: true, install: undefined, pack: current };
        }
        return installNow(fromCatalog(missing), { pack });
      });
    }

    async function updates(): Promise<readonly PackUpdate[]> {
      return updatesOf(await catalogReleases(), [...installed.values()]);
    }

    function update(pack: PackId): Promise<InstallOutcome> {
      return serial(async () => {
        const releases = await catalogReleases();
        const found = updatesOf(releases, [...installed.values()]).find((item) => item.pack === pack);
        const chosen = (found?.resources ?? []).flatMap(
          (item) =>
            releases.find(
              (release) =>
                release.publisher === item.publisher &&
                release.resource === item.resource &&
                release.tag === item.available.tag,
            ) ?? [],
        );
        return installNow(fromCatalog(chosen), { pack });
      });
    }

    function remove(pack: PackId): Promise<RemoveOutcome> {
      return serial(async () => {
        if (!installed.has(pack)) {
          await context.emit({ type: 'Failure', payload: { code: 'pack.not-found', context: { pack } } });
          return { ok: false, pack, code: 'pack.not-found' };
        }
        await context.emit({ type: 'PackRemoved', payload: { pack } });
        installed.delete(pack);
        failures.delete(pack);
        try {
          await ports.db.transaction((transaction) => deleteInstalledPack(transaction, pack));
          await ports.files.remove(packDirectory(pack));
          return { ok: true, pack };
        } catch (error) {
          const code = failureCodeOf(error);
          await context.emit({ type: 'Failure', payload: { code, context: { pack } } });
          return { ok: false, pack, code };
        }
      });
    }

    async function status(language: string): Promise<LanguageStatus> {
      const pack = languagePackId(language);
      const releases = await catalogReleases();
      const current = installed.get(pack);
      const missing = missingReleases(releases, pack, current);
      const found = updatesOf(releases, current === undefined ? [] : [current])[0];
      const burritos = current?.burritos ?? [];
      const missingKeys = new Set(missing.map(resourceKey));
      return {
        language,
        pack,
        installed: burritos,
        missing,
        updates: found?.resources ?? [],
        failed: (failures.get(pack) ?? []).filter((item) => missingKeys.has(resourceKey(item))),
        complete: burritos.length > 0 && missing.length === 0,
      };
    }

    async function storage(): Promise<Storage> {
      const packs = sortedPacks().map((pack) => ({
        pack: pack.pack,
        kind: pack.kind,
        language: pack.language,
        bytes: pack.bytes,
      }));
      return {
        packs,
        used: packs.reduce((sum, pack) => sum + pack.bytes, 0),
        freeSpace: await ports.files.freeSpace(),
      };
    }

    return {
      api: {
        install,
        importFile,
        importPicked,
        installFromCatalog,
        update,
        remove,
        installed: sortedPacks,
        installing: () => [...progress.values()].map((item) => ({ ...item })),
        updates,
        status,
        storage,
        defaults: async (pack) => defaultReleases(await catalogReleases(), pack),
        optional: async (pack) => optionalReleases(await catalogReleases(), pack),
        installOptional: (pack, wanted) =>
          serial(async () => {
            const chosen = optionalReleases(await catalogReleases(), pack).filter(
              (release) => resourceKey(release) === resourceKey(wanted),
            );
            return installNow(fromCatalog(chosen), { pack });
          }),
      },
      async start() {
        let roots: readonly string[] | undefined;
        try {
          for (const pack of await readInstalledPacks(ports.db)) {
            installed.set(pack.pack, pack);
          }
          roots = [...installed.values()].flatMap((pack) => pack.burritos.map((burrito) => burrito.root));
        } catch {
          roots = undefined;
        }
        try {
          await recoverPacks(ports.files, roots);
        } catch {
          return;
        }
      },
      snapshot: () => ({
        installed: sortedPacks().map((pack) => ({
          pack: pack.pack,
          kind: pack.kind,
          language: pack.language ?? null,
          source: pack.source,
          bytes: pack.bytes,
          burritos: pack.burritos.map((burrito) => ({
            publisher: burrito.provenance.publisher,
            resource: burrito.provenance.resource,
            tag: burrito.provenance.tag,
            row: burrito.row,
            bytes: burrito.bytes,
          })),
        })),
        installing: [...progress.values()].map((item) => ({ ...item })),
        failed: [...failures.entries()]
          .sort(([left], [right]) => compareText(left, right))
          .map(([pack, releases]) => ({ pack, releases: releases.map((item) => ({ ...item })) })),
      }),
      redo: {
        PackInstallStarted: async (event) => {
          const known = await catalogReleases().catch(() => []);
          const choiceOf = (ref: ReleaseRef) =>
            known.find(
              (release) =>
                release.pack === event.payload.pack &&
                resourceKey(release) === resourceKey(ref) &&
                release.tag === ref.tag,
            ) ?? refOf(ref);
          const resolved: Resolved = {
            kind: event.payload.source,
            offers: event.payload.releases.map((ref) => catalogOffer(ports, choiceOf(ref))),
            announce: false,
            replayed: true,
          };
          await serial(() => installer.prepare(resolved, { pack: event.payload.pack }));
        },
        PackRemoved: async (event) => {
          await remove(event.payload.pack);
        },
      },
    };
  },
});
