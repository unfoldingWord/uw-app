import { fontFor, type ResolvedFont } from '@shared/fonts/families';
import type { Theme } from '@shared/theme';

export function coreFont(theme: Theme, weight: number): ResolvedFont {
  return fontFor(theme.fontStack.fontCore, weight) ?? { fontFamily: theme.text.body.fontFamily };
}
