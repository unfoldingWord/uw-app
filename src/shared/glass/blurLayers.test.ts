import { describe, expect, it } from 'vitest';
import { blurRenders } from './blurLayers';

const open = {
  reducedBlur: false,
  intensity: 40,
  platform: 'ios',
  hasTarget: false,
  insideGlass: false,
} as const;

describe('PRD 10.3 never more than two glass levels', () => {
  it('blurs a surface, chip, icon button or input that sits on the aurora', () => {
    expect(blurRenders(open)).toBe(true);
  });

  it('drops the blur of a chip or icon button inside a glass surface, keeping its fill', () => {
    expect(blurRenders({ ...open, insideGlass: true })).toBe(false);
  });

  it('never blurs in reduced-blur mode, at zero intensity, or on Android without a blur target', () => {
    expect(blurRenders({ ...open, reducedBlur: true })).toBe(false);
    expect(blurRenders({ ...open, intensity: 0 })).toBe(false);
    expect(blurRenders({ ...open, platform: 'android' })).toBe(false);
    expect(blurRenders({ ...open, platform: 'android', hasTarget: true })).toBe(true);
  });
});
