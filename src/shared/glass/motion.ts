import { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, type EasingFunction } from 'react-native';
import type { CubicBezier, Keyframe } from '@shared/theme';
import { restingValues, segments, track, waveDelays, type KeyframeProperty } from './keyframeTimeline';

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

export type KeyframeWave = {
  value: (index: number, property: KeyframeProperty) => Animated.AnimatedInterpolation<number> | number;
};

export function useKeyframeWave(
  frames: readonly Keyframe[],
  totalMs: number,
  easing: CubicBezier,
  running: boolean,
  count: number,
): KeyframeWave {
  const phases = useMemo(() => Array.from({ length: count }, () => new Animated.Value(0)), [count]);
  const curve = useMemo(() => bezier(easing), [easing]);

  useEffect(() => {
    if (!running) {
      phases.forEach((phase) => phase.setValue(0));
      return undefined;
    }
    const delays = waveDelays(phases.length, totalMs);
    const wave = Animated.parallel(
      phases.map((phase, index) =>
        Animated.sequence([
          Animated.delay(delays[index] ?? 0),
          Animated.loop(
            Animated.sequence([
              Animated.timing(phase, { toValue: 0, duration: 0, useNativeDriver: true }),
              ...segments(frames, totalMs).map((segment) =>
                Animated.timing(phase, {
                  toValue: segment.toOffset,
                  duration: segment.durationMs,
                  easing: curve,
                  useNativeDriver: true,
                }),
              ),
            ]),
          ),
        ]),
      ),
    );
    wave.start();
    return () => wave.stop();
  }, [curve, frames, phases, running, totalMs]);

  return useMemo(
    () => ({
      value: (index: number, property: KeyframeProperty) => {
        const phase = phases[index];
        const { inputRange, outputRange } = track(frames, property);
        if (!running || phase === undefined || inputRange.length < 2) {
          return restingValues[property];
        }
        return phase.interpolate({ inputRange, outputRange });
      },
    }),
    [frames, phases, running],
  );
}
