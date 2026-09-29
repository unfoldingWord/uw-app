import { impactAsync, ImpactFeedbackStyle } from 'expo-haptics';
import { useCallback, useMemo, useRef, useState } from 'react';
import { Animated, type GestureResponderEvent } from 'react-native';
import { useTheme } from '@shared/theme';
import { bezier } from './motion';

export type PressState = {
  scale: Animated.Value;
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
  onPress: ((event: GestureResponderEvent) => void) | undefined,
  inert: boolean,
): PressState {
  const theme = useTheme();
  const scale = useRef(new Animated.Value(1)).current;
  const [focused, setFocused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const curve = useMemo(() => bezier(theme.motion.easing.easeLiquid), [theme]);

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

  const handlers = useMemo(
    () => ({
      onPressIn: () => {
        if (!inert) {
          settle(theme.motion.pressScale);
        }
      },
      onPressOut: () => settle(1),
      onPress: (event: GestureResponderEvent) => {
        if (inert || onPress === undefined) {
          return;
        }
        impactAsync(ImpactFeedbackStyle.Light).catch(() => undefined);
        onPress(event);
      },
      onFocus: () => setFocused(true),
      onBlur: () => setFocused(false),
      onHoverIn: () => setHovered(true),
      onHoverOut: () => setHovered(false),
    }),
    [inert, onPress, settle, theme],
  );

  return { scale, focused, hovered, handlers };
}
