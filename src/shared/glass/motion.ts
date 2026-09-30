import { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, type EasingFunction } from 'react-native';
import type { CubicBezier, Keyframe } from '@shared/theme';
import { restingValues, segments, track, type KeyframeProperty } from './keyframeTimeline';

export function bezier(curve: CubicBezier): EasingFunction {
  return Easing.bezier(curve[0], curve[1], curve[2], curve[3]);
}

export type KeyframeLoop = {
  value: (property: KeyframeProperty, scale?: number) => Animated.AnimatedInterpolation<number> | number;
};

export function useKeyframeLoop(
  frames: readonly Keyframe[],
  totalMs: number,
  easing: CubicBezier,
  running: boolean,
): KeyframeLoop {
  const phase = useRef(new Animated.Value(0)).current;
  const curve = useMemo(() => bezier(easing), [easing]);

  useEffect(() => {
    if (!running) {
      phase.setValue(0);
      return undefined;
    }
    const steps = segments(frames, totalMs).map((segment) =>
      Animated.timing(phase, {
        toValue: segment.toOffset,
        duration: segment.durationMs,
        easing: curve,
        useNativeDriver: true,
      }),
    );
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(phase, { toValue: 0, duration: 0, useNativeDriver: true }),
        ...steps,
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [curve, frames, phase, running, totalMs]);

  return useMemo(
    () => ({
      value: (property: KeyframeProperty, scale = 1) => {
        const { inputRange, outputRange } = track(frames, property, scale);
        if (!running || inputRange.length < 2) {
          return restingValues[property] * scale;
        }
        return phase.interpolate({ inputRange, outputRange });
      },
    }),
    [frames, phase, running],
  );
}
