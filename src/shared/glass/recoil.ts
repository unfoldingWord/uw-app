import type { CubicBezier, Theme } from '@shared/theme';
import { track, type Track } from './keyframeTimeline';

export type RecoilStep = { duration: number; easing: CubicBezier };

export type RecoilPlan = {
  squashAt: number;
  pressIn: RecoilStep;
  release: RecoilStep;
  tracks: { scaleX: Track; scaleY: Track };
};

export function recoilPlan(theme: Theme): RecoilPlan {
  const frames = theme.motion.keyframes.recoil;
  const squash = theme.motion.recoilSquash;
  const squashAt =
    frames.find((frame) => frame.values.scaleX === squash.scaleX && frame.values.scaleY === squash.scaleY)
      ?.offset ?? 0;
  return {
    squashAt,
    pressIn: { duration: theme.motion.duration.durRecoil, easing: theme.motion.easing.easeRecoil },
    release: { duration: theme.motion.duration.durMorph, easing: theme.motion.easing.easeSettle },
    tracks: { scaleX: track(frames, 'scaleX'), scaleY: track(frames, 'scaleY') },
  };
}
