import type { IndexCost } from '@lib/corpus/types';
import type { PackKind } from '@lib/domain/pack';
import type { Kernel } from '@lib/kernel';
import type { RemoveOutcome } from '@lib/packs/types';
import {
  direction,
  localeNames,
  needsDirectionChange,
  type Direction,
  type Locale,
} from '@lib/strings/locales';
import { leavingFolds, type LeavingFold } from '@lib/telemetry/folds';
import { settingsWords, type SettingsWords } from './strings';

export type ThemeChoice = 'system' | 'light' | 'dark';

export type Scheme = 'light' | 'dark';

export type Appearance = { readonly scheme?: Scheme; readonly reducedBlur?: boolean };

export type LocaleChoice = {
  readonly locale: Locale;
  readonly name: string;
  readonly direction: Direction;
  readonly complete: boolean;
  readonly selected: boolean;
};

export type FullTextState = {
  readonly on: boolean;
  readonly built: boolean;
  readonly languages: readonly string[];
  readonly cost: IndexCost;
  readonly about: string;
};

export type StoragePack = {
  readonly pack: string;
  readonly kind: PackKind;
  readonly language: string | undefined;
  readonly bytes: number;
  readonly size: string;
  readonly label: string;
};

export type StorageView = {
  readonly packs: readonly StoragePack[];
  readonly used: number;
  readonly free: number;
  readonly summary: string;
  readonly low: boolean;
};

export type PrivacyCount = { readonly fold: LeavingFold; readonly label: string };

export type PrivacyView = {
  readonly title: string;
  readonly summary: string;
  readonly intro: string;
  readonly counts: readonly PrivacyCount[];
  readonly notes: readonly string[];
};

export type SettingsEntryId =
  | 'appLanguage'
  | 'theme'
  | 'reducedBlur'
  | 'firstName'
  | 'fullText'
  | 'storage'
  | 'licence'
  | 'about'
  | 'privacy'
  | 'diagnostics';

export type SettingsEntry = { readonly id: SettingsEntryId; readonly title: string; readonly about: string };

export type SettingsService = {
  words(): SettingsWords;
  locales(): readonly LocaleChoice[];
  locale(): Locale;
  setLocale(locale: Locale): Promise<boolean>;
  onLocale(listener: (locale: Locale) => void): () => void;
  layoutDirection(): Direction;
  directionChangeNeeded(currentIsRTL: boolean): boolean;
  onLayoutDirection(listener: (direction: Direction) => void): () => void;
  theme(): ThemeChoice;
  setTheme(theme: ThemeChoice): Promise<boolean>;
  reducedBlur(): boolean | undefined;
  setReducedBlur(on: boolean): Promise<boolean>;
  appearance(): Appearance;
  onAppearance(listener: (appearance: Appearance) => void): () => void;
  name(): string | undefined;
  setName(name: string): Promise<boolean>;
  fullText(): Promise<FullTextState>;
  setFullText(on: boolean): Promise<FullTextState>;
  storage(): Promise<StorageView>;
  remove(pack: string): Promise<RemoveOutcome>;
  privacy(): PrivacyView;
  entries(): Promise<readonly SettingsEntry[]>;
  footer(): string;
};

const lowSpaceBytes = 200 * 1000 * 1000;

function autonymOf(kernel: Kernel, language: string | undefined): string {
  if (language === undefined) {
    return '';
  }
  return kernel.catalog.languages().find((item) => item.language === language)?.autonym ?? language;
}

function storageLabel(
  kernel: Kernel,
  words: SettingsWords,
  kind: PackKind,
  language: string | undefined,
  size: string,
) {
  switch (kind) {
    case 'language':
      return words.t('storage.language', { language: autonymOf(kernel, language), size });
    case 'image':
      return words.t('storage.images', { size });
    case 'audio':
      return words.t('storage.audio', { language: autonymOf(kernel, language), size });
    case 'original':
      return words.t('storage.original', {
        resource: words.t(language === 'hbo' ? 'resource.hebrew' : 'resource.greek'),
        size,
      });
  }
}

export function createSettingsService(kernel: Kernel): SettingsService {
  const { preferences } = kernel;
  const words = (): SettingsWords => settingsWords(kernel);

  const appearance = (): Appearance => {
    const theme = preferences.get('home.theme');
    const blur = preferences.get('settings.reducedBlur');
    return {
      ...(theme === 'light' || theme === 'dark' ? { scheme: theme } : {}),
      ...(blur === undefined ? {} : { reducedBlur: blur === 'on' }),
    };
  };

  const fullText = async (): Promise<FullTextState> => {
    const languages = kernel.corpus.languages();
    const costs = await Promise.all(languages.map((language) => kernel.corpus.indexCost(language)));
    const cost = costs.reduce<IndexCost>(
      (sum, item) => ({ entries: sum.entries + item.entries, bytes: sum.bytes + item.bytes }),
      { entries: 0, bytes: 0 },
    );
    const largest = Math.max(0, ...costs.map((item) => item.bytes));
    return {
      on: languages.length > 0 && languages.every((language) => kernel.corpus.indexWanted(language)),
      built: languages.length > 0 && languages.every((language) => kernel.corpus.index(language).built),
      languages,
      cost,
      about: words().t('settings.fullText.about', { size: words().size(largest) }),
    };
  };

  const storage = async (): Promise<StorageView> => {
    const current = words();
    const report = await kernel.packs.storage();
    return {
      packs: report.packs.map((pack) => {
        const size = current.size(pack.bytes);
        return {
          pack: pack.pack,
          kind: pack.kind,
          language: pack.language,
          bytes: pack.bytes,
          size,
          label: storageLabel(kernel, current, pack.kind, pack.language, size),
        };
      }),
      used: report.used,
      free: report.freeSpace,
      summary: current.t('storage.summary', {
        used: current.size(report.used),
        free: current.size(report.freeSpace),
      }),
      low: report.freeSpace < lowSpaceBytes,
    };
  };

  return {
    words,
    locales: () => {
      const current = preferences.locale();
      const complete = new Map(kernel.strings.completeness().map((item) => [item.locale, item.complete]));
      return kernel.strings.locales.map((locale) => ({
        locale,
        name: localeNames[locale],
        direction: kernel.strings.direction(locale),
        complete: complete.get(locale) ?? false,
        selected: locale === current,
      }));
    },
    locale: () => preferences.locale(),
    setLocale: (locale) =>
      kernel.strings.isLocale(locale) ? preferences.set('settings.locale', locale) : Promise.resolve(false),
    onLocale: (listener) =>
      preferences.onChange((key) => {
        if (key === 'settings.locale') {
          listener(preferences.locale());
        }
      }),
    layoutDirection: () => direction(preferences.locale()),
    directionChangeNeeded: (currentIsRTL) => needsDirectionChange(preferences.locale(), currentIsRTL),
    onLayoutDirection: (listener) =>
      preferences.onChange((key) => {
        if (key === 'settings.locale') {
          listener(direction(preferences.locale()));
        }
      }),
    theme: () => preferences.get('home.theme') ?? 'system',
    setTheme: (theme) => preferences.set('home.theme', theme),
    reducedBlur: () => {
      const blur = preferences.get('settings.reducedBlur');
      return blur === undefined ? undefined : blur === 'on';
    },
    setReducedBlur: (on) => preferences.set('settings.reducedBlur', on ? 'on' : 'off'),
    appearance,
    onAppearance: (listener) =>
      preferences.onChange((key) => {
        if (key === 'home.theme' || key === 'settings.reducedBlur') {
          listener(appearance());
        }
      }),
    name: () => preferences.get('home.name'),
    setName: (name) => preferences.set('home.name', name),
    fullText,
    async setFullText(on) {
      for (const language of kernel.corpus.languages()) {
        if (on) {
          await kernel.corpus.reindex(language);
        } else {
          await kernel.corpus.dropIndex(language);
        }
      }
      return fullText();
    },
    storage,
    remove: (pack) => kernel.packs.remove(pack),
    privacy: () => {
      const current = words();
      return {
        title: current.t('privacy.title'),
        summary: current.t('privacy.summary'),
        intro: current.t('privacy.counts'),
        counts: leavingFolds.map((fold) => ({ fold, label: current.t(`privacy.count.${fold}`) })),
        notes: [
          current.t('privacy.dropped'),
          current.t('privacy.never'),
          current.t('privacy.local'),
          current.t('privacy.backup'),
        ],
      };
    },
    async entries() {
      const current = words();
      const text = await fullText();
      const used = (await kernel.packs.storage()).used;
      return [
        {
          id: 'appLanguage',
          title: current.t('settings.appLanguage'),
          about: current.t('settings.appLanguage.about'),
        },
        { id: 'theme', title: current.t('settings.theme'), about: current.t('settings.theme.about') },
        {
          id: 'reducedBlur',
          title: current.t('settings.reducedBlur'),
          about: current.t('settings.reducedBlur.about'),
        },
        {
          id: 'firstName',
          title: current.t('settings.firstName'),
          about: current.t('settings.firstName.about'),
        },
        { id: 'fullText', title: current.t('settings.fullText'), about: text.about },
        {
          id: 'storage',
          title: current.t('settings.storage'),
          about: current.t('settings.storage.about', { size: current.size(used) }),
        },
        { id: 'licence', title: current.t('settings.licence'), about: current.t('settings.licence.about') },
        { id: 'about', title: current.t('settings.about'), about: current.t('settings.about.about') },
        { id: 'privacy', title: current.t('settings.privacy'), about: current.t('settings.privacy.about') },
        {
          id: 'diagnostics',
          title: current.t('settings.diagnostics'),
          about: current.t('settings.diagnostics.about'),
        },
      ];
    },
    footer: () => words().t('settings.footer'),
  };
}
