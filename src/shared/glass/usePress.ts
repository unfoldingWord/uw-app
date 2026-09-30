import { impactAsync, ImpactFeedbackStyle } from 'expo-haptics';
import { useCallback, useMemo, useRef, useState } from 'react';
import { Animated, type GestureResponderEvent } from 'react-native';
import { useTheme } from '@shared/theme';
import { bezier } from './motion';
import { createPressGate } from './pressGate';
import { recoilPlan } from './recoil';

export type PressHandler = (event: GestureResponderEvent) => unknown;

export type PressFeel = 'press' | 'recoil';

export type PressTransform = (
  | { scale: Animated.Value }
  | { scaleX: Animated.AnimatedInterpolation<number> }
  | { scaleY: Animated.AnimatedInterpolation<number> }
)[];

export type PressState = {
  transform: PressTransform;
  pending: boolean;
  focused: boolean;
  hovered: boolean;
  handlers: {
    onPressIn: () => void;
    onPressOut: () => void;
    onPress: (event: GestureResponderEvent) => void;
    onFocus: () => void;
    onBlur: () => void;
    onHoverIn: () => void;
    onHoverOut: () => void;
  };
};

export function usePress(
  onPress: PressHandler | undefined,
  inert: boolean,
  feel: PressFeel = 'press',
): PressState {
  const theme = useTheme();
  const scale = useRef(new Animated.Value(1)).current;
  const phase = useRef(new Animated.Value(0)).current;
  const [pending, setPending] = useState(false);
  const [gate] = useState(() => createPressGate(setPending));
  const [focused, setFocused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const curve = useMemo(() => bezier(theme.motion.easing.easeLiquid), [theme]);
  const plan = useMemo(() => recoilPlan(theme), [theme]);
  const recoilIn = useMemo(() => bezier(plan.pressIn.easing), [plan]);
  const recoilOut = useMemo(() => bezier(plan.release.easing), [plan]);

  const transform = useMemo<PressTransform>(
    () =>
      feel === 'recoil'
        ? [
            { scaleX: phase.interpolate(plan.tracks.scaleX) },
            { scaleY: phase.interpolate(plan.tracks.scaleY) },
          ]
        : [{ scale }],
    [feel, phase, plan, scale],
  );

  const settle = useCallback(
    (toValue: number) => {
      Animated.timing(scale, {
        toValue,
        duration: theme.motion.duration.durFast,
        easing: curve,
        useNativeDriver: true,
      }).start();
    },
    [curve, scale, theme],
  );

  const squash = useCallback(() => {
    phase.stopAnimation();
    phase.setValue(0);
    Animated.timing(phase, {
      toValue: plan.squashAt,
      duration: plan.pressIn.duration,
      easing: recoilIn,
      useNativeDriver: true,
    }).start();
  }, [phase, plan, recoilIn]);

  const rebound = useCallback(() => {
    Animated.timing(phase, {
      toValue: 1,
      duration: plan.release.duration,
      easing: recoilOut,
      useNativeDriver: true,
    }).start();
  }, [phase, plan, recoilOut]);

  const handlers = useMemo(
    () => ({
      onPressIn: () => {
        if (inert || gate.busy()) {
          return;
        }
        if (feel === 'recoil') {
          squash();
        } else {
          settle(theme.motion.pressScale);
        }
      },
      onPressOut: () => (feel === 'recoil' ? rebound() : settle(1)),
      onPress: (event: GestureResponderEvent) => {
        if (inert || onPress === undefined || gate.busy()) {
          return;
        }
        impactAsync(ImpactFeedbackStyle.Light).catch(() => undefined);
        gate.press(() => onPress(event));
      },
      onFocus: () => setFocused(true),
      onBlur: () => setFocused(false),
      onHoverIn: () => setHovered(true),
      onHoverOut: () => setHovered(false),
    }),
    [feel, gate, inert, onPress, rebound, settle, squash, theme],
  );

  return { transform, pending, focused, hovered, handlers };
}
