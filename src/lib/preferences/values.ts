import { isLanguageTag } from '../domain/language';
import { freeText, languageValue, preferenceSchemas, type PreferenceKey } from '../domain/preferences';
import { isLocale } from '../strings/locales';

type Schemas = typeof preferenceSchemas;

export type PreferenceValue<K extends PreferenceKey> = Schemas[K] extends readonly (infer L extends string)[]
  ? L
  : string;

export type FreeTextKey = {
  [K in PreferenceKey]: Schemas[K] extends typeof freeText ? K : never;
}[PreferenceKey];

export const lastPassagePrefix = 'study.lastPassage';

export const maximumNameLength = 40;

export function isFreeText(key: PreferenceKey): key is FreeTextKey {
  return preferenceSchemas[key] === freeText;
}

export function lastPassageKey(language: string): string {
  return `${lastPassagePrefix}.${language}`;
}

function normalizedName(value: string): string | undefined {
  const trimmed = value.trim().replace(/\s+/gu, ' ');
  return trimmed === '' || [...trimmed].length > maximumNameLength ? undefined : trimmed;
}

export function normalizedValue(key: PreferenceKey, value: string): string | undefined {
  const spec: string | readonly string[] = preferenceSchemas[key];
  if (key === 'home.name') {
    return normalizedName(value);
  }
  if (key === 'settings.locale') {
    return isLocale(value) ? value : undefined;
  }
  if (spec === languageValue) {
    return isLanguageTag(value) ? value : undefined;
  }
  if (typeof spec === 'string') {
    return value;
  }
  return spec.includes(value) ? value : undefined;
}
