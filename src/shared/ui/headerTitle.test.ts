import { describe, expect, it } from 'vitest';
import { createTheme } from '@shared/theme';
import { titleSize, titleStyle } from './headerTitle';
import { prototypeValues } from './prototypeValues';

const theme = createTheme({ scheme: 'light', reducedBlur: false });
const urdu = createTheme({ scheme: 'light', reducedBlur: false, locale: 'ur' });

describe('one header, the title sized from the prototype (issue #37)', () => {
  it('sets a tab screen title at the hero size, a sub-screen at 24 px and a centred detail at 17 px', () => {
    expect(titleSize(false, false)).toBe('screen');
    expect(titleSize(true, false)).toBe('subScreen');
    expect(titleSize(true, true)).toBe('detail');
    expect(titleStyle(theme, 'screen', 'Formation')).toEqual({});
    expect(titleStyle(theme, 'subScreen', 'Settings').fontSize).toBe(prototypeValues.header.subScreenTitle);
    expect(titleStyle(theme, 'detail', 'Story 1 of 50').fontSize).toBe(theme.fontSize.fsSubtitle);
  });

  it('keeps the hero tracking in proportion and the prototype line heights', () => {
    const sub = titleStyle(theme, 'subScreen', 'Settings');
    const size = prototypeValues.header.subScreenTitle;
    expect(sub.lineHeight).toBeCloseTo(size * theme.lineHeight.lhHero);
    expect(sub.letterSpacing).toBeCloseTo(theme.letterSpacing.lsHero * size);
    const detail = titleStyle(theme, 'detail', 'Story 1 of 50');
    expect(detail.lineHeight).toBeCloseTo(
      theme.fontSize.fsSubtitle * prototypeValues.header.detailTitleLineHeight,
    );
  });

  it('keeps the Nastaliq line height and drops tracking in a script face', () => {
    const sub = titleStyle(urdu, 'subScreen', 'ترتیبات');
    const size = prototypeValues.header.subScreenTitle;
    expect(sub.letterSpacing).toBeUndefined();
    expect(Number(sub.lineHeight)).toBeGreaterThanOrEqual(2 * size - 0.01);
    const detail = titleStyle(urdu, 'detail', 'کہانی');
    expect(Number(detail.lineHeight)).toBeGreaterThanOrEqual(2 * theme.fontSize.fsSubtitle - 0.01);
  });
});
