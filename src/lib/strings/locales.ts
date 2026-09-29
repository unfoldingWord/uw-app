export const locales = [
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
] as const;

export type Locale = (typeof locales)[number];

export type Direction = 'ltr' | 'rtl';

export const sourceLocale: Locale = 'en';

const rightToLeft: ReadonlySet<Locale> = new Set<Locale>(['ar', 'ur', 'fa']);

const knownLocales: ReadonlySet<string> = new Set(locales);

const localeOfLanguage: Readonly<Record<string, Locale>> = {
  en: 'en',
  es: 'es-419',
  fr: 'fr',
  hi: 'hi',
  ru: 'ru',
  ar: 'ar',
  zh: 'zh-Hans',
  sw: 'sw',
  swh: 'sw',
  pt: 'pt-BR',
  id: 'id',
  in: 'id',
  vi: 'vi',
  bn: 'bn',
  ur: 'ur',
  fa: 'fa',
  pes: 'fa',
  prs: 'fa',
  my: 'my',
  nl: 'nl',
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && knownLocales.has(value);
}

export function direction(locale: Locale): Direction {
  return rightToLeft.has(locale) ? 'rtl' : 'ltr';
}

function localeOfTag(tag: string): Locale | undefined {
  const normalized = tag.trim().replaceAll('_', '-');
  if (isLocale(normalized)) {
    return normalized;
  }
  const language = normalized.split('-')[0]?.toLowerCase() ?? '';
  return localeOfLanguage[language];
}

export function resolveLocale(tags: readonly string[]): Locale {
  for (const tag of tags) {
    const locale = localeOfTag(tag);
    if (locale !== undefined) {
      return locale;
    }
  }
  return sourceLocale;
}
