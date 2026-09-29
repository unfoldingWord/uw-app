import { isLanguageTag } from './language';

export const freeText = 'free-text';

export const languageValue = 'language';

type PreferenceSpec = typeof freeText | typeof languageValue | readonly string[];

export const preferenceSchemas = {
  'home.name': freeText,
  'home.theme': ['system', 'light', 'dark'],
  'settings.locale': freeText,
  'settings.reducedBlur': ['on', 'off'],
  'settings.fullText': ['on', 'off'],
  'study.language': languageValue,
  'study.reading': ['literal', 'simplified'],
  'formation.englishMovements': ['on', 'off'],
} as const satisfies Record<string, PreferenceSpec>;

export type PreferenceKey = keyof typeof preferenceSchemas;

export const preferenceKeys = Object.keys(preferenceSchemas) as readonly PreferenceKey[];

export function preferenceProblem(key: PreferenceKey, value: string | undefined): string | undefined {
  const spec: PreferenceSpec = preferenceSchemas[key];
  if (spec === freeText) {
    return value === undefined
      ? undefined
      : `${key} is typed by a leader, so its value never enters the journal`;
  }
  if (value === undefined) {
    return `${key} needs a value`;
  }
  if (spec === languageValue) {
    return isLanguageTag(value) ? undefined : `${key} takes a language tag`;
  }
  return spec.includes(value) ? undefined : `${key} takes one of ${spec.join(', ')}`;
}
