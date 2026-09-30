import { describe, expect, it } from 'vitest';
import { minimumTouchTarget, slopFor } from '@shared/glass/pressGate';
import { createTheme } from '@shared/theme';
import { choiceExtent } from './touchExtent';

const theme = createTheme({ scheme: 'light', reducedBlur: false });

describe('SE-2 every choice pill is at least a 44 px touch target', () => {
  it('reaches 44 px with its hit slop, with and without a detail line', () => {
    for (const detail of [false, true]) {
      const extent = choiceExtent(theme, detail);
      expect(extent + 2 * slopFor(extent)).toBeGreaterThanOrEqual(minimumTouchTarget);
    }
  });

  it('measures the pill from its padding and its lines', () => {
    expect(choiceExtent(theme, false)).toBe(2 * theme.space.sp4 + theme.text.label.lineHeight);
  });
});
