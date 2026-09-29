import type { TextStyle } from 'react-native';
import type { Script } from '@shared/fonts';
import { withScript, type Theme } from '@shared/theme';

export type Direction = 'ltr' | 'rtl';

const scriptRanges: readonly (readonly [Script, RegExp])[] = [
  ['arabic', /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/u],
  ['devanagari', /[\u0900-\u097F]/u],
  ['bengali', /[\u0980-\u09FF]/u],
  ['myanmar', /[\u1000-\u109F]/u],
];

const urduLanguages: readonly string[] = ['ur'];

export function scriptOf(language: string, sample: string): Script | undefined {
  const found = scriptRanges.find(([, range]) => range.test(sample))?.[0];
  if (found === 'arabic' && urduLanguages.includes(language.split('-')[0] ?? language)) {
    return 'urdu';
  }
  return found;
}

export function contentText(
  theme: Theme,
  base: Theme['text'][keyof Theme['text']],
  options: { language: string; sample: string; direction?: Direction },
): TextStyle {
  const script = scriptOf(options.language, options.sample);
  const font = script === undefined ? base : withScript(base, theme.fontStack.fontText, script);
  return options.direction === undefined
    ? { ...font, textAlign: 'auto' }
    : { ...font, writingDirection: options.direction, textAlign: 'auto' };
}
