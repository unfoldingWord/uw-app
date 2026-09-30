import type { Kernel } from '@lib/kernel';
import type { PluralKey, StringKey, Words } from '@lib/strings/types';

type Area = 'transfer' | 'resource' | 'common' | 'state' | 'failure';

type AreaKey<K extends string> = Extract<K, `${Area}.${string}`>;

export type TransferWords = Words<AreaKey<StringKey>, AreaKey<PluralKey>> & { size(bytes: number): string };

const sizeUnits = ['B', 'KB', 'MB', 'GB', 'TB'] as const;

function sizeIn(locale: string, bytes: number): string {
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

export function transferWords(kernel: Kernel): TransferWords {
  const words = kernel.strings.words(kernel.preferences.locale());
  return { ...words, size: (bytes) => sizeIn(words.locale, bytes) };
}
