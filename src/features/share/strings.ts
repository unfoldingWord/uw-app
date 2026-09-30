import type { Kernel } from '@lib/kernel';
import type { PluralKey, StringKey, Words } from '@lib/strings/types';

type Area = 'share' | 'common' | 'state' | 'failure';

type AreaKey<K extends string> = Extract<K, `${Area}.${string}`>;

export type ShareWords = Words<AreaKey<StringKey>, AreaKey<PluralKey>>;

export function shareWords(kernel: Kernel): ShareWords {
  return kernel.strings.words(kernel.preferences.locale());
}
