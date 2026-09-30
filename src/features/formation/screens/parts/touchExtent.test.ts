import { describe, expect, it } from 'vitest';
import { minimumTouchTarget, slopFor } from '@shared/glass/pressGate';
import { createTheme } from '@shared/theme';
import { movementChipExtent } from './touchExtent';

const theme = createTheme({ scheme: 'light', reducedBlur: false });

describe('SE-2 every movement chip is at least a 44 px touch target', () => {
  it('reaches 44 px with its hit slop', () => {
    const extent = movementChipExtent(theme);
    expect(extent).toBe(2 * theme.space.sp3 + theme.text.caption.lineHeight);
    expect(extent + 2 * slopFor(extent)).toBeGreaterThanOrEqual(minimumTouchTarget);
  });
});
