import { describe, expect, it } from 'vitest';
import { englishAreas } from './en/index';
import {
  direction,
  localeSignOffs,
  locales,
  needsDirectionChange,
  offeredLocales,
  releaseGate,
  resolveLocale,
  type Locale,
  type LocaleSignOffs,
} from './locales';
import { tables } from './locales/index';
import { createStrings, stringsModule, type LocaleTables } from './strings';
import { english, type LocaleTable } from './table';

function untranslated(): LocaleTable {
  return Object.fromEntries(Object.keys(english).map((key) => [key, null])) as unknown as LocaleTable;
}

function tablesWith(locale: Locale, table: LocaleTable): LocaleTables {
  const empty = untranslated();
  return {
    ...(Object.fromEntries(locales.map((each) => [each, empty])) as Record<Locale, LocaleTable>),
    en: english,
    [locale]: table,
  };
}

const arabicMarkers = {
  zero: 'zero {count}',
  one: 'one {count}',
  two: 'two {count}',
  few: 'few {count}',
  many: 'many {count}',
  other: 'other {count}',
};

describe('strings interface', () => {
  it('words a key in English with its parameters', () => {
    const strings = createStrings(tables);
    expect(strings.t('onboarding.overline', 'en')).toBe('Open Bible translation resources');
    expect(strings.t('home.greeting.morning.named', 'en', { name: 'Amani' })).toBe('Good morning, Amani');
    expect(strings.t('storage.summary', 'en', { used: '112 MB', free: '9.4 GB' })).toBe(
      '112 MB on this phone · 9.4 GB free',
    );
  });

  it('falls back to English string by string when a locale has not translated a key', () => {
    const partial = { ...untranslated(), 'nav.home': 'Nyumbani' };
    const strings = createStrings(tablesWith('sw', partial));
    expect(strings.t('nav.home', 'sw')).toBe('Nyumbani');
    expect(strings.t('nav.study', 'sw')).toBe('Study');
    expect(strings.plural('languages.resources', 3, 'sw')).toBe('3 resources');
  });

  it('chooses among the six Arabic plural forms', () => {
    const table = { ...untranslated(), 'languages.resources': arabicMarkers };
    const strings = createStrings(tablesWith('ar', table));
    const forms = [0, 1, 2, 3, 11, 100].map((count) => strings.plural('languages.resources', count, 'ar'));
    expect(forms).toEqual(['zero 0', 'one 1', 'two 2', 'few 3', 'many 11', 'other 100']);
  });

  it('chooses the Russian forms for one, few and many', () => {
    const table = {
      ...untranslated(),
      'languages.resources': {
        one: 'one {count}',
        few: 'few {count}',
        many: 'many {count}',
        other: 'other {count}',
      },
    };
    const strings = createStrings(tablesWith('ru', table));
    const forms = [1, 2, 5, 21, 22, 25, 111].map((count) =>
      strings.plural('languages.resources', count, 'ru'),
    );
    expect(forms).toEqual(['one 1', 'few 2', 'many 5', 'one 21', 'few 22', 'many 25', 'many 111']);
  });

  it('uses the other form when a locale leaves a category out, and English rules for English forms', () => {
    const table = { ...untranslated(), 'languages.resources': { other: 'other {count}' } };
    const strings = createStrings(tablesWith('ar', table));
    expect(strings.plural('languages.resources', 1, 'ar')).toBe('other 1');
    expect(createStrings(tablesWith('ar', untranslated())).plural('languages.resources', 1, 'ar')).toBe(
      '1 resource',
    );
  });

  it('interpolates every parameter in a plural form, with a count the screen formatted', () => {
    const strings = createStrings(tables);
    expect(strings.plural('library.overline', 1, 'en', { language: 'Kiswahili' })).toBe(
      'Kiswahili · 1 resource',
    );
    expect(strings.plural('library.overline', 1200, 'en', { language: 'English', count: '1,200' })).toBe(
      'English · 1,200 resources',
    );
  });

  it('words the app in one locale whatever language the content is in', () => {
    const strings = createStrings(tables);
    expect(strings.t('state.notDownloaded', 'en', { language: 'Kiswahili' })).toBe(
      'Kiswahili is not on this phone yet.',
    );
    expect(strings.t('state.notDownloaded', 'sw', { language: 'English' })).toBe(
      'English bado haiko kwenye simu hii.',
    );
  });

  it('binds the words of one locale for a feature', () => {
    const words = createStrings(tables).words('ar');
    expect(words.locale).toBe('ar');
    expect(words.direction).toBe('rtl');
    expect(words.t('nav.home')).toBe(createStrings(tables).t('nav.home', 'ar'));
    expect(words.plural('languages.resources', 2)).toBe('موردان');
  });

  it('uses the shipped Arabic and Russian forms', () => {
    const strings = createStrings(tables);
    expect([1, 2, 3, 11, 100].map((count) => strings.plural('languages.resources', count, 'ar'))).toEqual([
      'مورد واحد',
      'موردان',
      '3 موارد',
      '11 موردًا',
      '100 مورد',
    ]);
    expect([1, 3, 5].map((count) => strings.plural('library.books', count, 'ru'))).toEqual([
      '1 книга',
      '3 книги',
      '5 книг',
    ]);
    expect(strings.direction('ar')).toBe('rtl');
  });

  it('reports how complete each locale is', () => {
    const report = createStrings(tablesWith('nl', { ...untranslated(), 'nav.home': 'Start' })).completeness();
    const total = Object.keys(english).length;
    expect(report.find((row) => row.locale === 'en')).toEqual({
      locale: 'en',
      translated: total,
      total,
      complete: true,
    });
    expect(report.find((row) => row.locale === 'nl')).toEqual({
      locale: 'nl',
      translated: 1,
      total,
      complete: false,
    });
    expect(report.map((row) => row.locale)).toEqual([...locales]);
  });

  it('keeps each English key in exactly one area', () => {
    const areaKeys = Object.values(englishAreas).flatMap((area) => Object.keys(area));
    expect(new Set(areaKeys).size).toBe(areaKeys.length);
    expect(areaKeys.length).toBe(Object.keys(english).length);
  });

  it('is a kernel module with no events and nothing owned', () => {
    expect(stringsModule.events).toEqual([]);
    expect(stringsModule.owns).toEqual({ tables: [], directories: [], keys: [] });
  });
});

describe('locales', () => {
  it('registers the sixteen locales of the Open Bible Stories website', () => {
    expect(locales).toEqual([
      'en',
      'es-419',
      'fr',
      'hi',
      'ru',
      'ar',
      'zh-Hans',
      'sw',
      'pt-BR',
      'id',
      'vi',
      'bn',
      'ur',
      'fa',
      'my',
      'nl',
    ]);
  });

  it('lays out Arabic, Urdu and Farsi right to left and every other locale left to right', () => {
    expect(locales.filter((locale) => direction(locale) === 'rtl')).toEqual(['ar', 'ur', 'fa']);
  });

  it('asks for a layout change only when the app locale and the current layout direction disagree', () => {
    expect(needsDirectionChange('ar', false)).toBe(true);
    expect(needsDirectionChange('ur', false)).toBe(true);
    expect(needsDirectionChange('fa', false)).toBe(true);
    expect(needsDirectionChange('ar', true)).toBe(false);
    expect(needsDirectionChange('en', true)).toBe(true);
    expect(needsDirectionChange('sw', true)).toBe(true);
    expect(needsDirectionChange('en', false)).toBe(false);
    expect(locales.filter((locale) => needsDirectionChange(locale, false))).toEqual(['ar', 'ur', 'fa']);
    expect(locales.filter((locale) => !needsDirectionChange(locale, true))).toEqual(['ar', 'ur', 'fa']);
  });

  it('maps device locale tags to a registered locale, in the order the device prefers them', () => {
    expect(resolveLocale(['es-MX'], locales)).toBe('es-419');
    expect(resolveLocale(['es'], locales)).toBe('es-419');
    expect(resolveLocale(['pt'], locales)).toBe('pt-BR');
    expect(resolveLocale(['pt-PT'], locales)).toBe('pt-BR');
    expect(resolveLocale(['zh-CN'], locales)).toBe('zh-Hans');
    expect(resolveLocale(['zh-Hans-CN'], locales)).toBe('zh-Hans');
    expect(resolveLocale(['sw_KE'], locales)).toBe('sw');
    expect(resolveLocale(['fa-IR'], locales)).toBe('fa');
    expect(resolveLocale(['ur-PK'], locales)).toBe('ur');
    expect(resolveLocale(['in-ID'], locales)).toBe('id');
    expect(resolveLocale(['de-DE', 'fr-CA'], locales)).toBe('fr');
    expect(resolveLocale(['de-DE'], locales)).toBe('en');
    expect(resolveLocale([], locales)).toBe('en');
    expect(resolveLocale(['pt-BR'], locales)).toBe('pt-BR');
    expect(resolveLocale(['my-MM'], locales)).toBe('my');
  });

  it('offers English and the signed-off locales only, unless the drafts gate is set', () => {
    const unsigned = Object.fromEntries(
      locales.flatMap((locale) => (locale === 'en' ? [] : [[locale, null]])),
    );
    const none = unsigned as LocaleSignOffs;
    expect(offeredLocales('reviewed', none)).toEqual(['en']);
    expect(offeredLocales('reviewed', { ...none, sw: '2026-10-02', ar: '2026-10-05' })).toEqual([
      'en',
      'ar',
      'sw',
    ]);
    expect(offeredLocales('drafts', none)).toEqual(locales);
    expect(offeredLocales()).toEqual(offeredLocales('reviewed', localeSignOffs));
    expect(releaseGate).toBe('reviewed');
  });

  it('resolves a device or a stored choice to English when its locale is not offered', () => {
    expect(resolveLocale(['fr-FR'], ['en'])).toBe('en');
    expect(resolveLocale(['fr-FR', 'es-MX'], ['en', 'es-419'])).toBe('es-419');
    expect(resolveLocale(['ar-EG'], ['en'])).toBe('en');
    expect(resolveLocale(['ar-EG'], locales)).toBe('ar');
  });

  it('lists and accepts only the offered locales, while every drafted table stays readable', () => {
    const released = createStrings(tables, 'reviewed');
    expect(released.locales).toEqual(offeredLocales('reviewed'));
    expect(released.isLocale('en')).toBe(true);
    expect(released.isLocale('fr')).toBe(localeSignOffs.fr !== null);
    expect(released.resolveLocale(['fr-FR'])).toBe(localeSignOffs.fr === null ? 'en' : 'fr');
    expect(released.completeness().map((row) => row.locale)).toEqual([...locales]);
    const drafts = createStrings(tables, 'drafts');
    expect(drafts.locales).toEqual(locales);
    expect(drafts.isLocale('ar')).toBe(true);
    expect(drafts.t('common.back', 'fr')).not.toBe(drafts.t('common.back', 'en'));
  });
});
