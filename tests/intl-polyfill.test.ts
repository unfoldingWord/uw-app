import { afterAll, describe, expect, it } from 'vitest';
import { locales } from '@lib/strings/locales';

const native = Intl.PluralRules;

const samples = [0, 1, 2, 3, 5, 11, 21, 100, 102];

afterAll(() => {
  Object.defineProperty(Intl, 'PluralRules', { value: native, configurable: true, writable: true });
});

describe('the plural rules polyfill for Hermes', () => {
  it('installs on a runtime without Intl.PluralRules and selects what ICU selects in all sixteen locales', async () => {
    const expected = Object.fromEntries(
      locales.map((locale) => [locale, samples.map((count) => new native(locale).select(count))]),
    );
    Reflect.deleteProperty(Intl, 'PluralRules');
    expect('PluralRules' in Intl).toBe(false);
    const { pluralLocaleData } = await import('@platform/intl');
    expect(pluralLocaleData).toHaveLength(16);
    expect(Intl.PluralRules).not.toBe(native);
    const polyfilled = Object.fromEntries(
      locales.map((locale) => [locale, samples.map((count) => new Intl.PluralRules(locale).select(count))]),
    );
    expect(polyfilled).toEqual(expected);
  });
});
