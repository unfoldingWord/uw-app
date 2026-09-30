import type { Kernel } from '@lib/kernel';
import type { Words } from '@lib/strings/strings';
import type { PluralKey, StringKey } from '@lib/strings/table';

type Area = 'diagnostics' | 'common' | 'failure';

type AreaKey<K extends string> = Extract<K, `${Area}.${string}`>;

export type DiagnosticsWords = Words<AreaKey<StringKey>, AreaKey<PluralKey>>;

export function diagnosticsWords(kernel: Kernel): DiagnosticsWords {
  return kernel.strings.words(kernel.preferences.locale());
}
