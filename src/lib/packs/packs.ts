import { readCatalogReleases } from '../catalog/store';
import type { CatalogRelease } from '../catalog/types';
import { failureCodeOf } from '../domain/failures';
import { languagePackId, packDirectory, packsDirectory, type PackId } from '../domain/pack';
import { refOf } from '../domain/release';
import { defineModule } from '../module';
import { catalogOffer, createInstaller, resolveSource, type Resolved } from './install';
import { defaultReleases, missingReleases, updatesOf } from './plan';
import { fromCatalog, type PackPlan, type PackSource } from './source';
import { deleteInstalledPack, packTables, readInstalledPacks } from './store';
import { recoverPacks } from './swap';
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
  complete: boolean;
};

export type PacksApi = {
  install(source: PackSource, plan?: PackPlan): Promise<InstallOutcome>;
  installFromCatalog(pack: PackId): Promise<InstallOutcome>;
  update(pack: PackId): Promise<InstallOutcome>;
  remove(pack: PackId): Promise<RemoveOutcome>;
  installed(): readonly InstalledPack[];
  installing(): readonly InstallProgress[];
  updates(): Promise<readonly PackUpdate[]>;
  status(language: string): Promise<LanguageStatus>;
  storage(): Promise<Storage>;
  defaults(pack: PackId): Promise<readonly CatalogRelease[]>;
};

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
      progress,
    });

    const sortedPacks = (): InstalledPack[] =>
      [...installed.values()].sort((left, right) => left.pack.localeCompare(right.pack));

    const catalogReleases = (): Promise<CatalogRelease[]> => readCatalogReleases(ports.db);

    async function installNow(source: PackSource, plan: PackPlan): Promise<InstallOutcome> {
      const resolution = await resolveSource(ports, source);
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

    function installFromCatalog(pack: PackId): Promise<InstallOutcome> {
      return serial(async () => {
        const current = installed.get(pack);
        const missing = missingReleases(await catalogReleases(), pack, current);
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
        try {
          await ports.db.transaction((session) => deleteInstalledPack(session, pack));
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
      return {
        language,
        pack,
        installed: burritos,
        missing,
        updates: found?.resources ?? [],
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
        installFromCatalog,
        update,
        remove,
        installed: sortedPacks,
        installing: () => [...progress.values()].map((item) => ({ ...item })),
        updates,
        status,
        storage,
        defaults: async (pack) => defaultReleases(await catalogReleases(), pack),
      },
      async start() {
        let known: readonly PackId[] | undefined;
        try {
          for (const pack of await readInstalledPacks(ports.db)) {
            installed.set(pack.pack, pack);
          }
          known = [...installed.keys()];
        } catch {
          known = undefined;
        }
        try {
          await recoverPacks(ports.files, known);
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
      }),
      redo: {
        PackInstallStarted: async (event) => {
          const resolved: Resolved = {
            kind: event.payload.source,
            offers: event.payload.releases.map((ref) => catalogOffer(ports, refOf(ref))),
            announce: false,
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
