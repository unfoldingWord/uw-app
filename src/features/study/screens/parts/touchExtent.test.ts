import { describe, expect, it } from 'vitest';
import { minimumTouchTarget, touchSlop } from '@shared/glass/pressGate';
import { createTheme } from '@shared/theme';
import { choicePillExtent } from './touchExtent';

const theme = createTheme({ scheme: 'light', reducedBlur: false });

describe('SE-2 every Study choice pill is at least a 44 px touch target (issue #62)', () => {
  it('reaches 44 px with its hit slop, compact and full', () => {
    for (const compact of [true, false]) {
      const extent = choicePillExtent(theme, compact);
      expect(extent + 2 * touchSlop(extent).hitSlop.top).toBeGreaterThanOrEqual(minimumTouchTarget);
    }
  });

  it('measures the pill from its padding, its line and its hairline', () => {
    const hairline = 2 * theme.border.borderHairline.width;
    expect(choicePillExtent(theme, true)).toBe(
      2 * theme.space.sp3 + theme.text.caption.lineHeight + hairline,
    );
    expect(choicePillExtent(theme, false)).toBe(2 * theme.space.sp4 + theme.text.label.lineHeight + hairline);
  });
});
