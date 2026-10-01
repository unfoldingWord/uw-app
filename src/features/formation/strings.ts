import type { Kernel } from '@lib/kernel';
import type { PluralKey, StringKey, Words } from '@lib/strings/types';

type Area = 'formation' | 'session' | 'movement' | 'common' | 'state' | 'failure';

type AreaKey<K extends string> = Extract<K, `${Area}.${string}`>;

export type FormationWords = Words<AreaKey<StringKey>, AreaKey<PluralKey>>;

export function formationWords(kernel: Kernel): FormationWords {
  return kernel.strings.words(kernel.preferences.locale());
}
