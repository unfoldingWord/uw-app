import type { Kernel } from '@lib/kernel';
import type { Words } from '@lib/strings/strings';
import type { PluralKey, StringKey } from '@lib/strings/table';

type Area = 'languages' | 'storage' | 'resource' | 'common' | 'state' | 'failure';

type AreaKey<K extends string> = Extract<K, `${Area}.${string}`>;

export type LanguagesWords = Words<AreaKey<StringKey>, AreaKey<PluralKey>> & { size(bytes: number): string };

const sizeUnits = ['B', 'KB', 'MB', 'GB', 'TB'] as const;

export function sizeIn(locale: string, bytes: number): string {
  let value = Math.max(0, bytes);
  let unit = 0;
  while (value >= 1000 && unit < sizeUnits.length - 1) {
    value /= 1000;
    unit += 1;
  }
  const digits = unit > 0 && value < 10 ? 1 : 0;
  const number = new Intl.NumberFormat(locale, { maximumFractionDigits: digits }).format(value);
  return `${number} ${sizeUnits[unit] ?? 'B'}`;
}

export function languagesWords(kernel: Kernel): LanguagesWords {
  const words = kernel.strings.words(kernel.preferences.locale());
  return { ...words, size: (bytes) => sizeIn(words.locale, bytes) };
}
