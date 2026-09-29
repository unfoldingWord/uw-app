import type { RefreshOutcome } from '@lib/catalog/catalog';
import type { CatalogLanguage, CatalogRelease, ScriptDirection } from '@lib/catalog/types';
import type { FailureCode } from '@lib/domain/failures';
import { imagePackId, languagePackId, originalPackId, type PackId } from '@lib/domain/pack';
import type { Kernel } from '@lib/kernel';
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
  downloadImages(): Promise<InstallOutcome>;
  audio(language: string): readonly OptionalDownload[];
  originals(): readonly OptionalDownload[];
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
    downloadImages: () => kernel.packs.installFromCatalog(imagePackId),
    audio: (language) =>
      optional(kernel.catalog.releases(language).filter((release) => release.kind === 'audio')),
    originals: () =>
      optional(kernel.catalog.originals()).filter(
        (item) => item.pack === originalPackId(item.release.language),
      ),
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
