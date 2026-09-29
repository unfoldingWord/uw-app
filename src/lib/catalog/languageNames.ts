import { isoNames } from './isoNames';

const tagNames: Readonly<Record<string, string>> = {
  'el-x-koine': 'Koine Greek',
  'es-419': 'Spanish (Latin America)',
  'pt-br': 'Portuguese (Brazil)',
  'pt-pt': 'Portuguese (Portugal)',
  'zh-tw': 'Chinese (Traditional)',
  'zh-hant': 'Chinese (Traditional)',
  'zh-cn': 'Chinese (Simplified)',
  'zh-hans': 'Chinese (Simplified)',
  'fr-ca': 'French (Canada)',
  'en-gb': 'English (United Kingdom)',
  'en-us': 'English (United States)',
  'sr-latn': 'Serbian (Latin)',
  'sr-cyrl': 'Serbian (Cyrillic)',
  'ur-deva': 'Urdu (Devanagari)',
  'pa-arab': 'Punjabi (Shahmukhi)',
};

export function englishNameOf(language: string, autonym: string): string {
  const tag = language.toLowerCase();
  const base = tag.split('-')[0] ?? tag;
  return tagNames[tag] ?? isoNames[tag] ?? isoNames[base] ?? autonym;
}
