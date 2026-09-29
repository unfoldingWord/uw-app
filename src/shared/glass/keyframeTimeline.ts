import type { Keyframe, KeyframeValues } from '@shared/theme';

export type KeyframeProperty = keyof KeyframeValues;

export type Segment = { toOffset: number; durationMs: number };

export const restingValues: Required<KeyframeValues> = {
  opacity: 1,
  translateX: 0,
  translateY: 0,
  translateXPercent: 0,
  translateYPercent: 0,
  scale: 1,
  scaleX: 1,
  scaleY: 1,
  blur: 0,
};

export function segments(frames: readonly Keyframe[], totalMs: number): Segment[] {
  const result: Segment[] = [];
  for (let index = 1; index < frames.length; index += 1) {
    const previous = frames[index - 1];
    const current = frames[index];
    if (previous === undefined || current === undefined || current.offset === previous.offset) {
      continue;
    }
    result.push({ toOffset: current.offset, durationMs: (current.offset - previous.offset) * totalMs });
  }
  return result;
}

export type Track = { inputRange: number[]; outputRange: number[] };

export function track(frames: readonly Keyframe[], property: KeyframeProperty, scale = 1): Track {
  const unique = frames.filter((frame, index) => index === 0 || frames[index - 1]?.offset !== frame.offset);
  return {
    inputRange: unique.map((frame) => frame.offset),
    outputRange: unique.map((frame) => (frame.values[property] ?? restingValues[property]) * scale),
  };
}
