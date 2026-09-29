import type { Kernel } from '@lib/kernel';
import type { Words } from '@lib/strings/strings';
import type { PluralKey, StringKey } from '@lib/strings/table';

type Area = 'onboarding' | 'languages' | 'common' | 'state' | 'failure';

type AreaKey<K extends string> = Extract<K, `${Area}.${string}`>;

export type OnboardingWords = Words<AreaKey<StringKey>, AreaKey<PluralKey>>;

export function onboardingWords(kernel: Kernel): OnboardingWords {
  return kernel.strings.words(kernel.preferences.locale());
}
