import { describe, expect, it } from 'vitest';
import { locales } from '@lib/strings/locales';
import { pluralCategory, pluralCategoriesOf } from '@lib/strings/plural';

const integers = Array.from({ length: 2400 }, (_, index) => index);
const samples = [
  ...integers,
  1_000_000,
  2_000_000,
  3_000_000,
  1_000_001,
  10_000_000,
  100_000_000,
  0.5,
  1.5,
  2.25,
  3.1,
  11.5,
  21.4,
  100.01,
];

describe('plural rules as data (CLDR, checked against the ICU in Node)', () => {
  it.each(locales.map((locale) => [locale]))('%s selects the same category as Intl.PluralRules', (locale) => {
    const reference = new Intl.PluralRules(locale);
    const differing = samples.filter((count) => pluralCategory(locale, count) !== reference.select(count));
    expect(differing).toEqual([]);
  });

  it.each(locales.map((locale) => [locale]))('%s lists the categories Intl.PluralRules lists', (locale) => {
    const reference = new Intl.PluralRules(locale).resolvedOptions().pluralCategories.map(String).sort();
    expect([...pluralCategoriesOf(locale)].sort()).toEqual(reference);
  });
});
