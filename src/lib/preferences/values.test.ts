import { describe, expect, it } from 'vitest';
import { isFreeText, lastPassageKey, maximumNameLength, normalizedValue } from './values';

describe('preference values', () => {
  it('accepts only the closed values, a language tag or one of the sixteen locales', () => {
    expect(normalizedValue('home.theme', 'dark')).toBe('dark');
    expect(normalizedValue('home.theme', 'purple')).toBeUndefined();
    expect(normalizedValue('study.language', 'qaa')).toBe('qaa');
    expect(normalizedValue('study.language', 'not a tag')).toBeUndefined();
    expect(normalizedValue('settings.locale', 'sw')).toBe('sw');
    expect(normalizedValue('settings.locale', 'de')).toBeUndefined();
  });

  it('keeps a first name short and tidy, and never journals it', () => {
    expect(normalizedValue('home.name', '  Mary   Ann ')).toBe('Mary Ann');
    expect(normalizedValue('home.name', '   ')).toBeUndefined();
    expect(normalizedValue('home.name', 'a'.repeat(maximumNameLength + 1))).toBeUndefined();
    expect(isFreeText('home.name')).toBe(true);
    expect(isFreeText('settings.locale')).toBe(true);
    expect(isFreeText('home.theme')).toBe(false);
    expect(lastPassageKey('qaa')).toBe('study.lastPassage.qaa');
  });
});
