import type { Theme } from '@shared/theme';

export function choicePillExtent(theme: Theme, compact: boolean): number {
  const hairline = 2 * theme.border.borderHairline.width;
  return compact
    ? 2 * theme.space.sp3 + theme.text.caption.lineHeight + hairline
    : 2 * theme.space.sp4 + theme.text.label.lineHeight + hairline;
}
