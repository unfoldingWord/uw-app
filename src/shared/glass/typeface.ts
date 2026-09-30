import type { ResolvedFont } from '@shared/fonts/families';
import { uiFont, type Theme } from '@shared/theme';

export function coreFont(theme: Theme, weight: number, sample: string | undefined): ResolvedFont {
  return uiFont(theme, theme.fontStack.fontCore, weight, sample);
}
