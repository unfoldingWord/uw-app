import type { Theme } from '@shared/theme';

export function movementChipExtent(theme: Theme): number {
  return 2 * theme.space.sp3 + theme.text.caption.lineHeight;
}
