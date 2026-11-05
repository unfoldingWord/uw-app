import type { ReactNode } from 'react';
import { Animated, type StyleProp, type ViewStyle } from 'react-native';
import { useKeyframeLoop } from '@shared/glass/motion';
import { referenceValues } from '@shared/glass/referenceValues';
import { useTheme } from '@shared/theme';

export type BusyFadeProps = {
  busy: boolean;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
};

export function BusyFade({ busy, style, children }: BusyFadeProps) {
  const theme = useTheme();
  const pulse = useKeyframeLoop(
    theme.motion.keyframes.breathe,
    referenceValues.dotRing.breatheMs,
    theme.motion.easing.easeLiquid,
    busy && !theme.reducedMotion,
  );
  return <Animated.View style={[style, { opacity: pulse.value('opacity') }]}>{children}</Animated.View>;
}
