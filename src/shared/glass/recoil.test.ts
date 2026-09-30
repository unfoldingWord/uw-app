import { describe, expect, it } from 'vitest';
import { createTheme } from '@shared/theme';
import { recoilPlan } from './recoil';

const theme = createTheme({ scheme: 'light', reducedBlur: false });
const still = createTheme({ scheme: 'light', reducedBlur: false, reducedMotion: true });

describe('the recoil press (design-system readme, Recoil; issue #41)', () => {
  it('squashes to --recoil-squash over --dur-recoil on --ease-recoil', () => {
    const plan = recoilPlan(theme);
    const at = plan.squashAt;
    const scaleX = plan.tracks.scaleX.outputRange[plan.tracks.scaleX.inputRange.indexOf(at)];
    const scaleY = plan.tracks.scaleY.outputRange[plan.tracks.scaleY.inputRange.indexOf(at)];
    expect(scaleX).toBe(theme.motion.recoilSquash.scaleX);
    expect(scaleY).toBe(theme.motion.recoilSquash.scaleY);
    expect(plan.pressIn.duration).toBe(theme.motion.duration.durRecoil);
    expect(plan.pressIn.easing).toEqual(theme.motion.easing.easeRecoil);
  });

  it('rebounds past rest and settles on --ease-settle over the morph', () => {
    const plan = recoilPlan(theme);
    const after = plan.tracks.scaleY.inputRange
      .map((offset, index) => ({ offset, value: plan.tracks.scaleY.outputRange[index] ?? 1 }))
      .filter((frame) => frame.offset > plan.squashAt);
    expect(after.some((frame) => frame.value > 1)).toBe(true);
    expect(after.at(-1)?.value).toBe(1);
    expect(plan.release.easing).toEqual(theme.motion.easing.easeSettle);
    expect(plan.release.duration).toBe(theme.motion.duration.durMorph);
  });

  it('drops the rebound under Reduce Motion, as the reduced-motion tokens shorten the morph', () => {
    const plan = recoilPlan(still);
    expect(plan.release.duration).toBe(still.motion.duration.durMorph);
    expect(plan.release.duration).toBeLessThan(theme.motion.duration.durMicro);
  });
});
