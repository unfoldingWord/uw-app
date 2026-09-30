import { defineModule, ownsNothing } from '../module';
import {
  direction,
  isLocale,
  locales,
  resolveLocale,
  sourceLocale,
  type Direction,
  type Locale,
} from './locales';
import { tables } from './locales/index';
import { pluralCategory } from './plural';
import {
  english,
  isPluralForms,
  type Key,
  type LocaleTable,
  type ParamValue,
  type PluralCategory,
  type PluralForms,
  type PluralKey,
  type PluralParams,
  type StringKey,
  type StringParams,
} from './table';

export type Completeness = {
  locale: Locale;
  translated: number;
  total: number;
  complete: boolean;
};

export type Words<S extends StringKey = StringKey, P extends PluralKey = PluralKey> = {
  readonly locale: Locale;
  readonly direction: Direction;
  t<K extends S>(key: K, ...params: StringParams<K>): string;
  plural<K extends P>(key: K, count: number, ...params: PluralParams<K>): string;
};

export type StringsApi = {
  locales: readonly Locale[];
  t<K extends StringKey>(key: K, locale: Locale, ...params: StringParams<K>): string;
  plural<K extends PluralKey>(key: K, count: number, locale: Locale, ...params: PluralParams<K>): string;
  direction(locale: Locale): Direction;
  resolveLocale(tags: readonly string[]): Locale;
  isLocale(value: unknown): value is Locale;
  completeness(): readonly Completeness[];
  words(locale: Locale): Words;
};

const placeholder = /\{(\w+)\}/g;

function interpolate(template: string, params: Readonly<Record<string, ParamValue>>): string {
  return template.replace(placeholder, (whole, name: string) => {
    const value = params[name];
    return value === undefined ? whole : String(value);
  });
}

function stringIn(table: LocaleTable, key: StringKey): string | undefined {
  const value = table[key];
  return typeof value === 'string' ? value : undefined;
}

function formsIn(table: LocaleTable, key: PluralKey): PluralForms | undefined {
  const value = table[key];
  return isPluralForms(value) ? value : undefined;
}

function formFor(forms: PluralForms, category: PluralCategory): string {
  return forms[category] ?? forms.other;
}

const keys = Object.keys(english) as Key[];

export type LocaleTables = Readonly<Record<Locale, LocaleTable>>;

export function createStrings(localeTables: LocaleTables): StringsApi {
  function t<K extends StringKey>(key: K, locale: Locale, ...params: StringParams<K>): string {
    const template = stringIn(localeTables[locale], key) ?? stringIn(english, key) ?? key;
    return interpolate(template, params[0] ?? {});
  }

  function plural<K extends PluralKey>(
    key: K,
    count: number,
    locale: Locale,
    ...params: PluralParams<K>
  ): string {
    const translated = formsIn(localeTables[locale], key);
    const forms = translated ?? formsIn(english, key);
    const category = pluralCategory(translated === undefined ? sourceLocale : locale, count);
    const template = forms === undefined ? key : formFor(forms, category);
    return interpolate(template, { count: String(count), ...(params[0] ?? {}) });
  }

  function completeness(): readonly Completeness[] {
    return locales.map((locale) => {
      const table = localeTables[locale];
      const translated = keys.filter((key) => table[key] !== null).length;
      return { locale, translated, total: keys.length, complete: translated === keys.length };
    });
  }

  function words(locale: Locale): Words {
    return {
      locale,
      direction: direction(locale),
      t: (key, ...params) => t(key, locale, ...params),
      plural: (key, count, ...params) => plural(key, count, locale, ...params),
    };
  }

  return { locales, t, plural, direction, resolveLocale, isLocale, completeness, words };
}

export const stringsModule = defineModule<StringsApi>({
  events: [],
  owns: ownsNothing,
  create() {
    return { api: createStrings(tables) };
  },
});
