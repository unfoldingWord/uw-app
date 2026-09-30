import type { Theme } from '@shared/theme';

export function choiceExtent(theme: Theme, detail: boolean): number {
  return 2 * theme.space.sp4 + theme.text.label.lineHeight + (detail ? theme.text.caption.lineHeight : 0);
}
