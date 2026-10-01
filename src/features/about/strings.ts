import type { Kernel } from '@lib/kernel';
import type { PluralKey, StringKey, Words } from '@lib/strings/types';

type Area = 'about' | 'licence' | 'resource' | 'invitation' | 'impact' | 'storage' | 'common' | 'failure';

type AreaKey<K extends string> = Extract<K, `${Area}.${string}`>;

export type AboutWords = Words<AreaKey<StringKey>, AreaKey<PluralKey>>;

export function aboutWords(kernel: Kernel): AboutWords {
  return kernel.strings.words(kernel.preferences.locale());
}
