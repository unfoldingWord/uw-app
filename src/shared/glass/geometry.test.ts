import { describe, expect, it } from 'vitest';
import { createTheme } from '@shared/theme/createTheme';
import { dotRingBands, filamentPath } from './geometry';
import { segments, track, waveDelays } from './keyframeTimeline';
import { shadowCss, splitShadows } from './shadows';

const theme = createTheme({ scheme: 'light', reducedBlur: false });

describe('dotRingBands', () => {
  it('places denser, fainter bands outward the way the reference ring does', () => {
    const points = dotRingBands(170, 7, 30).flat();
    expect(points).toHaveLength([12, 15, 18, 21, 24, 27, 30].reduce((sum, count) => sum + count, 0));
    const first = points[0];
    const last = points[points.length - 1];
    expect(first?.opacity).toBe(1);
    expect(last?.opacity).toBeCloseTo(0.25 + 0.75 * (1 / 7));
    for (const point of points) {
      expect(Math.hypot(point.x - 85, point.y - 85)).toBeLessThanOrEqual(85.0001);
    }
  });
});

describe('filamentPath', () => {
  it('draws a straight line for one child and two curves for a branch', () => {
    expect(filamentPath(70, 120, false)).toBe('M 1 0 L 1 70');
    expect(filamentPath(70, 150, true)).toBe(
      'M 75 0 C 75 38.5, 8 31.5, 8 70 M 75 0 C 75 38.5, 142 31.5, 142 70',
    );
  });
});

describe('keyframe timeline', () => {
  it('splits a keyframe list into timed segments with one easing each', () => {
    expect(segments(theme.motion.keyframes.float, 6000)).toEqual([
      { toOffset: 0.5, durationMs: 3000 },
      { toOffset: 1, durationMs: 3000 },
    ]);
  });

  it('starts each ring of a wave one equal share of the loop after the ring inside it', () => {
    expect(waveDelays(4, 4500)).toEqual([0, 1125, 2250, 3375]);
    expect(waveDelays(1, 4500)).toEqual([0]);
    const bands = dotRingBands(170, 7, 30);
    expect(bands.map((band) => band.length)).toEqual([12, 15, 18, 21, 24, 27, 30]);
    expect(bands.every((band) => band.every((point) => point.opacity === band[0]?.opacity))).toBe(true);
  });

  it('fills a property the frame leaves out with its resting value', () => {
    expect(track(theme.motion.keyframes.rise, 'scale')).toEqual({
      inputRange: [0, 1],
      outputRange: [0.94, 1],
    });
    expect(track(theme.motion.keyframes.drift, 'translateXPercent', 4)).toEqual({
      inputRange: [0, 0.33, 0.66, 1],
      outputRange: [0, 12, -8, 0],
    });
  });
});

describe('shadows', () => {
  it('separates the inset light from the outer shadow so each lands on its own layer', () => {
    const split = splitShadows([theme.shadow.shadowRest, theme.shadow.innerTop]);
    expect(split).toEqual({
      outset: '0px 1px 2px 0px rgba(1,66,99,.05), 0px 6px 18px 0px rgba(1,66,99,.06)',
      inset: 'inset 0px 1px 0px 0px rgba(255,255,255,.75)',
    });
    expect(shadowCss([undefined])).toBeUndefined();
  });
});
