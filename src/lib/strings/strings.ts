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

export type StringsApi = {
  locales: readonly Locale[];
  t<K extends StringKey>(key: K, locale: Locale, ...params: StringParams<K>): string;
  plural<K extends PluralKey>(key: K, count: number, locale: Locale, ...params: PluralParams<K>): string;
  direction(locale: Locale): Direction;
  resolveLocale(tags: readonly string[]): Locale;
  isLocale(value: unknown): value is Locale;
  completeness(): readonly Completeness[];
};

const placeholder = /\{(\w+)\}/g;

const pluralRules = new Map<Locale, Intl.PluralRules>();

function rulesFor(locale: Locale): Intl.PluralRules {
  const known = pluralRules.get(locale);
  if (known !== undefined) {
    return known;
  }
  const created = new Intl.PluralRules(locale);
  pluralRules.set(locale, created);
  return created;
}

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
    const category = rulesFor(translated === undefined ? sourceLocale : locale).select(
      count,
    ) as PluralCategory;
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

  return { locales, t, plural, direction, resolveLocale, isLocale, completeness };
}

export const stringsModule = defineModule<StringsApi>({
  events: [],
  owns: ownsNothing,
  create() {
    return { api: createStrings(tables) };
  },
});
