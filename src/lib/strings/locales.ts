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

export const localeNames: Readonly<Record<Locale, string>> = Object.freeze({
  en: 'English',
  'es-419': 'Español (Latinoamérica)',
  fr: 'Français',
  hi: 'हिन्दी',
  ru: 'Русский',
  ar: 'العربية',
  'zh-Hans': '简体中文',
  sw: 'Kiswahili',
  'pt-BR': 'Português (Brasil)',
  id: 'Bahasa Indonesia',
  vi: 'Tiếng Việt',
  bn: 'বাংলা',
  ur: 'اردو',
  fa: 'فارسی',
  my: 'မြန်မာ',
  nl: 'Nederlands',
});

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

export function needsDirectionChange(locale: Locale, currentIsRTL: boolean): boolean {
  return (direction(locale) === 'rtl') !== currentIsRTL;
}

function localeOfTag(tag: string): Locale | undefined {
  const normalized = tag.trim().replaceAll('_', '-');
  if (isLocale(normalized)) {
    return normalized;
  }
  const language = normalized.split('-')[0]?.toLowerCase() ?? '';
  return localeOfLanguage[language];
}

export type DraftedLocale = Exclude<Locale, 'en'>;

export type LocaleSignOffs = { readonly [L in DraftedLocale]: string | null };

export const localeSignOffs: LocaleSignOffs = Object.freeze({
  'es-419': null,
  fr: null,
  hi: null,
  ru: null,
  ar: null,
  'zh-Hans': null,
  sw: null,
  'pt-BR': null,
  id: null,
  vi: null,
  bn: null,
  ur: null,
  fa: null,
  my: null,
  nl: null,
});

export type LocaleGate = 'reviewed' | 'drafts';

export const releaseGate: LocaleGate = 'reviewed';

export function offeredLocales(
  gate: LocaleGate = releaseGate,
  signOffs: LocaleSignOffs = localeSignOffs,
): readonly Locale[] {
  return gate === 'drafts'
    ? locales
    : locales.filter((locale) => locale === 'en' || signOffs[locale] !== null);
}

export function resolveLocale(
  tags: readonly string[],
  offered: readonly Locale[] = offeredLocales(),
): Locale {
  for (const tag of tags) {
    const locale = localeOfTag(tag);
    if (locale !== undefined && offered.includes(locale)) {
      return locale;
    }
  }
  return sourceLocale;
}
