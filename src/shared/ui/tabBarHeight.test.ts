import { describe, expect, it } from 'vitest';
import { createTheme } from '@shared/theme';
import { restingTabBarHeight, tabBarGrowth } from './tabBarHeight';

const theme = createTheme({ scheme: 'light', reducedBlur: false });

describe('SE-2 the tab bar grows with dynamic type and the content clears it', () => {
  it('rests at the prototype height, a 52 px item inside 6 px of padding', () => {
    expect(restingTabBarHeight(theme)).toBe(64);
  });

  it('adds nothing until the measured bar is taller than it rests', () => {
    expect([tabBarGrowth(theme, 0), tabBarGrowth(theme, 64)]).toEqual([0, 0]);
  });

  it('adds every pixel the bar grew by to the content clearance', () => {
    expect(tabBarGrowth(theme, 101)).toBe(37);
  });
});
