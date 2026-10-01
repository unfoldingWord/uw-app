import { describe, expect, it } from 'vitest';
import { localeSignOffs, locales, offeredLocales } from '../../src/lib/strings/locales.ts';
import { tables } from '../../src/lib/strings/locales/index.ts';
import { infoPlistString, localNetworkUsage, systemPromptLocales } from './index.ts';

describe('the iOS local network prompt', () => {
  it('comes from the string table in English for Info.plist itself', () => {
    expect(localNetworkUsage('en')).toBe(tables.en['transfer.localNetwork.prompt']);
    expect(localNetworkUsage('en')).toContain('only while you send or receive');
  });

  it('has an InfoPlist.strings entry in every one of the sixteen locales under the drafts gate', () => {
    const drafted = systemPromptLocales('drafts');
    expect(Object.keys(drafted).sort()).toEqual([...locales].sort());
    for (const locale of locales) {
      const prompt = drafted[locale]?.ios.NSLocalNetworkUsageDescription;
      expect(prompt, locale).toBeTruthy();
      if (locale !== 'en') {
        expect(prompt, locale).not.toBe(localNetworkUsage('en'));
      }
    }
  });

  it('ships a translation only for English and the signed-off locales under the release gate', () => {
    const signed = { ...localeSignOffs, fr: '2026-10-01' };
    const shipped = Object.keys(systemPromptLocales('reviewed', signed));
    expect(shipped).toEqual([...offeredLocales('reviewed', signed)]);
    expect(shipped).toEqual(expect.arrayContaining(['en', 'fr']));
    expect(Object.keys(systemPromptLocales())).toEqual([...offeredLocales()]);
  });

  it('escapes what a strings file would read as the end of a value', () => {
    expect(infoPlistString('Say "yes" \\ go\nnow')).toBe('Say \\"yes\\" \\\\ go\\nnow');
  });
});
