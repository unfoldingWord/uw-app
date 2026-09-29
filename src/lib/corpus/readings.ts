import type { LocalizedText } from '../burrito/metadata';
import type { CorpusKind, Reading, TextChoice } from './types';

export const literalTextCodes: readonly string[] = [
  'ult',
  'ulb',
  'glt',
  'tpl',
  'rlob',
  'irv',
  'ayt',
  'avd',
  'bsb',
];

export const simplifiedTextCodes: readonly string[] = [
  'ust',
  'udb',
  'gst',
  'rsob',
  'ueb',
  'arst',
  'nav',
  't4t',
];

const simplifiedNames =
  /simplif|\bsimple\b|dynamic|easy|plain|everyday|sencill|facile|fácil|упрощ|простой|sederhana|mudah|dễ hiểu|giản|简|簡|आसान|সরল|آسان|ساده|مبسط|rahisi|eenvoudig/iu;

export type TextIdentification = { readonly abbreviation: LocalizedText; readonly name: LocalizedText };

function codeOf(resource: string, language: string): string {
  const lower = resource.toLowerCase();
  const prefix = `${language.toLowerCase()}_`;
  return lower.startsWith(prefix) ? lower.slice(prefix.length) : (lower.split('_').at(-1) ?? lower);
}

function pinned(code: string): TextChoice | undefined {
  if (literalTextCodes.includes(code)) {
    return 'literal';
  }
  return simplifiedTextCodes.includes(code) ? 'simplified' : undefined;
}

export function readingOfText(
  resource: string,
  language: string,
  identification: TextIdentification,
): TextChoice {
  const fromResource = pinned(codeOf(resource, language));
  if (fromResource !== undefined) {
    return fromResource;
  }
  for (const abbreviation of Object.values(identification.abbreviation)) {
    const fromAbbreviation = pinned(abbreviation.trim().toLowerCase());
    if (fromAbbreviation !== undefined) {
      return fromAbbreviation;
    }
  }
  return Object.values(identification.name).some((name) => simplifiedNames.test(name))
    ? 'simplified'
    : 'literal';
}

const studyHelpsCodes: readonly string[] = ['sn', 'sq', 'obs-sn', 'obs-sq'];

export function isStudyResource(resource: string, language: string): boolean {
  return studyHelpsCodes.includes(codeOf(resource, language));
}

export function readingOfKind(kind: CorpusKind): Reading {
  return kind === 'simplified' || kind === 'original' ? kind : 'literal';
}
