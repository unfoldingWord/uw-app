import type { Kernel } from '@lib/kernel';
import type { PluralKey, StringKey, Words } from '@lib/strings/types';

type Area = 'study' | 'library' | 'resource' | 'article' | 'search' | 'common' | 'state' | 'failure';

type AreaKey<K extends string> = Extract<K, `${Area}.${string}`>;

export type StudyWords = Words<AreaKey<StringKey>, AreaKey<PluralKey>>;

export function studyWords(kernel: Kernel): StudyWords {
  return kernel.strings.words(kernel.preferences.locale());
}
