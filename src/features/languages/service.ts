import type { RefreshOutcome } from '@lib/catalog/catalog';
import type { CatalogLanguage, CatalogRelease, ScriptDirection } from '@lib/catalog/types';
import type { FailureCode } from '@lib/domain/failures';
import { imagePackId, languagePackId, originalPackId, type PackId } from '@lib/domain/pack';
import type { Kernel } from '@lib/kernel';
import { optionalReleases } from '@lib/packs/plan';
import type { InstallOutcome, PackUpdate, RemoveOutcome, Storage } from '@lib/packs/types';
import { languagesWords, type LanguagesWords } from './strings';

export type LanguageRow = {
  readonly language: string;
  readonly autonym: string;
  readonly englishName: string;
  readonly direction: ScriptDirection;
  readonly resources: number;
  readonly detail: string;
  readonly offline: boolean;
  readonly badge: string | undefined;
  readonly selected: boolean;
  readonly installing: boolean;
  readonly pack: PackId;
};

export type OptionalDownload = {
  readonly release: CatalogRelease;
  readonly pack: PackId;
  readonly title: string;
  readonly installed: boolean;
};

export type MoreDownload = OptionalDownload & { readonly detail: string };

export type MissingResource = {
  readonly publisher: string;
  readonly resource: string;
  readonly title: string;
  readonly detail: string;
  readonly code: FailureCode | undefined;
};

export type ImportOutcome = { ok: true; installed: PackId | undefined } | { ok: false; code: FailureCode };

export type LanguagesService = {
  words(): LanguagesWords;
  refresh(): Promise<RefreshOutcome>;
  online(): Promise<boolean>;
  list(query?: string): readonly LanguageRow[];
  overline(): string;
  current(): string | undefined;
  select(language: string): Promise<boolean>;
  download(language: string): Promise<InstallOutcome>;
  missing(): Promise<readonly MissingResource[]>;
  downloadImages(): Promise<InstallOutcome>;
  audio(language: string): readonly OptionalDownload[];
  originals(): readonly OptionalDownload[];
  more(): readonly MoreDownload[];
  installMore(item: MoreDownload): Promise<InstallOutcome>;
  install(pack: PackId): Promise<InstallOutcome>;
  remove(pack: PackId): Promise<RemoveOutcome>;
  storage(): Promise<Storage>;
  updates(): Promise<readonly PackUpdate[]>;
  update(pack: PackId): Promise<InstallOutcome>;
  importFile(): Promise<ImportOutcome>;
  importOpened(uri: string): Promise<ImportOutcome>;
  openedName(uri: string): string;
};

function languageBytes(releases: readonly CatalogRelease[]): number | undefined {
  const sizes = releases.filter((release) => release.kind === 'language').map((release) => release.bytes);
  return sizes.length === 0 || sizes.some((bytes) => bytes === undefined)
    ? undefined
    : sizes.reduce<number>((sum, bytes) => sum + (bytes ?? 0), 0);
}

function installedPacks(kernel: Kernel): ReadonlySet<PackId> {
  return new Set(kernel.packs.installed().map((pack) => pack.pack));
}

function rowOf(kernel: Kernel, words: LanguagesWords, item: CatalogLanguage): LanguageRow {
  const pack = languagePackId(item.language);
  const bytes = languageBytes(kernel.catalog.releases(item.language));
  const resources = words.plural('languages.resources', item.resources);
  return {
    language: item.language,
    autonym: item.autonym,
    englishName: item.englishName,
    direction: item.direction,
    resources: item.resources,
    detail:
      bytes === undefined
        ? words.t('common.joined', { first: item.englishName, second: resources })
        : words.t('languages.row', { english: item.englishName, resources, size: words.size(bytes) }),
    offline: item.installed,
    badge: item.installed ? words.t('common.offline') : undefined,
    selected: kernel.preferences.contentLanguage() === item.language,
    installing: kernel.packs.installing().some((progress) => progress.pack === pack),
    pack,
  };
}

function importOutcomeOf(outcome: InstallOutcome | undefined): ImportOutcome {
  if (outcome === undefined) {
    return { ok: true, installed: undefined };
  }
  return outcome.ok ? { ok: true, installed: outcome.pack.pack } : { ok: false, code: outcome.code };
}

function decoded(part: string): string {
  try {
    return decodeURIComponent(part);
  } catch {
    return part;
  }
}

function nameOfOpened(uri: string): string {
  const path = decoded(uri.split(/[?#]/)[0] ?? uri);
  const name = path
    .split(/[/:]/)
    .filter((part) => part !== '')
    .at(-1);
  return name ?? uri;
}

export function createLanguagesService(kernel: Kernel): LanguagesService {
  const words = (): LanguagesWords => languagesWords(kernel);

  const optional = (releases: readonly CatalogRelease[]): readonly OptionalDownload[] => {
    const installed = installedPacks(kernel);
    return releases.flatMap((release) =>
      release.pack === undefined
        ? []
        : [{ release, pack: release.pack, title: release.title, installed: installed.has(release.pack) }],
    );
  };

  return {
    words,
    refresh: () => kernel.catalog.refresh(),
    online: () => kernel.catalog.online(),
    list(query) {
      const current = words();
      const found =
        query === undefined || query.trim() === ''
          ? kernel.catalog.languages()
          : kernel.catalog.search(query);
      return found.map((item) => rowOf(kernel, current, item));
    },
    overline() {
      const current = words();
      const language = kernel.preferences.contentLanguage();
      const autonym =
        kernel.catalog.languages().find((item) => item.language === language)?.autonym ?? language ?? '';
      return language === undefined
        ? current.t('languages.overline.onboarding')
        : current.plural('languages.overline', kernel.catalog.languages().length, { language: autonym });
    },
    current: () => kernel.preferences.contentLanguage(),
    select: (language) => kernel.preferences.set('study.language', language),
    download: (language) => kernel.packs.installFromCatalog(languagePackId(language)),
    async missing() {
      const language = kernel.preferences.contentLanguage();
      if (language === undefined) {
        return [];
      }
      const status = await kernel.packs.status(language);
      if (status.installed.length === 0) {
        return [];
      }
      const current = words();
      return status.missing.map((release) => ({
        publisher: release.publisher,
        resource: release.resource,
        title: release.title,
        detail: current.t('languages.release', { publisher: release.publisher, version: release.tag }),
        code: status.failed.find(
          (item) => item.publisher === release.publisher && item.resource === release.resource,
        )?.code,
      }));
    },
    downloadImages: () => kernel.packs.installFromCatalog(imagePackId),
    audio: (language) =>
      optional(kernel.catalog.releases(language).filter((release) => release.kind === 'audio')),
    originals: () =>
      optional(kernel.catalog.originals()).filter(
        (item) => item.pack === originalPackId(item.release.language),
      ),
    more() {
      const language = kernel.preferences.contentLanguage();
      if (language === undefined) {
        return [];
      }
      const pack = languagePackId(language);
      const current = words();
      const present = new Set(
        (kernel.packs.installed().find((item) => item.pack === pack)?.burritos ?? []).map(
          (burrito) => `${burrito.provenance.publisher}/${burrito.provenance.resource}`,
        ),
      );
      return optionalReleases(kernel.catalog.releases(language), pack).map((release) => ({
        release,
        pack,
        title: release.title,
        detail: current.t('languages.release', { publisher: release.publisher, version: release.tag }),
        installed: present.has(`${release.publisher}/${release.resource}`),
      }));
    },
    installMore: (item) => kernel.packs.installOptional(item.pack, item.release),
    install: (pack) => kernel.packs.installFromCatalog(pack),
    remove: (pack) => kernel.packs.remove(pack),
    storage: () => kernel.packs.storage(),
    updates: () => kernel.packs.updates(),
    update: (pack) => kernel.packs.update(pack),
    importFile: async () => importOutcomeOf(await kernel.packs.importPicked()),
    importOpened: async (uri) => importOutcomeOf(await kernel.packs.importFile(uri)),
    openedName: nameOfOpened,
  };
}
