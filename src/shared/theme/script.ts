import { isValidElement, type ReactNode } from 'react';
import type { TextStyle } from 'react-native';
import { fontFor, type ResolvedFont, type Script } from '@shared/fonts/families';
import { withScript, type TextStyleTokens, type Theme } from './createTheme';

export type Direction = 'ltr' | 'rtl';

const scriptRanges: readonly (readonly [Script, RegExp])[] = [
  ['arabic', /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/u],
  ['devanagari', /[\u0900-\u097F]/u],
  ['bengali', /[\u0980-\u09FF]/u],
  ['myanmar', /[\u1000-\u109F]/u],
];

const urduLanguages: readonly string[] = ['ur'];

const localeScripts: Readonly<Record<string, Script>> = {
  ar: 'arabic',
  fa: 'arabic',
  ur: 'urdu',
  hi: 'devanagari',
  bn: 'bengali',
  my: 'myanmar',
};

const strongRightToLeft = /[\u0590-\u08FF\uFB1D-\uFDFF\uFE70-\uFEFF]/u;

const strongLetter = /\p{L}/u;

function primaryOf(tag: string): string {
  return tag.split('-')[0] ?? tag;
}

export function directionOf(sample: string): Direction {
  const first = [...sample].find((character) => strongLetter.test(character));
  return first !== undefined && strongRightToLeft.test(first) ? 'rtl' : 'ltr';
}

export function scriptOf(language: string, sample: string): Script | undefined {
  const found = scriptRanges.find(([, range]) => range.test(sample))?.[0];
  if (found === 'arabic' && urduLanguages.includes(primaryOf(language))) {
    return 'urdu';
  }
  return found;
}

export function localeScript(locale: string): Script | undefined {
  return localeScripts[primaryOf(locale)];
}

export function textSample(children: ReactNode): string | undefined {
  const parts: string[] = [];
  const visit = (node: ReactNode): void => {
    if (typeof node === 'string' || typeof node === 'number') {
      parts.push(String(node));
      return;
    }
    if (Array.isArray(node)) {
      node.forEach(visit);
      return;
    }
    if (isValidElement<{ children?: ReactNode }>(node)) {
      visit(node.props.children);
    }
  };
  visit(children);
  return parts.length === 0 ? undefined : parts.join('');
}

function chromeScript(theme: Theme, sample: string | undefined): Script | undefined {
  return sample === undefined ? localeScript(theme.locale) : scriptOf(theme.locale, sample);
}

export function uiFont(
  theme: Theme,
  stack: readonly string[],
  weight: number,
  sample: string | undefined,
  options: { italic?: boolean } = {},
): ResolvedFont {
  const script = chromeScript(theme, sample);
  return (
    fontFor(stack, weight, { ...options, ...(script === undefined ? {} : { script }) }) ?? {
      fontFamily: theme.text.body.fontFamily,
    }
  );
}

export function uiText(theme: Theme, base: TextStyleTokens, sample: string | undefined): TextStyleTokens {
  const script = chromeScript(theme, sample);
  return script === undefined ? base : withScript(base, theme.fontStack.fontCore, script);
}

export function contentText(
  theme: Theme,
  base: TextStyleTokens,
  options: { language: string; sample: string; direction?: Direction },
): TextStyle {
  const script = scriptOf(options.language, options.sample);
  const font = script === undefined ? base : withScript(base, theme.fontStack.fontText, script);
  return options.direction === undefined
    ? { ...font, textAlign: 'auto' }
    : { ...font, writingDirection: options.direction, textAlign: 'auto' };
}
