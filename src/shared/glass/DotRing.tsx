import { useMemo, type ReactNode } from 'react';
import { Animated, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useTheme } from '@shared/theme';
import { dotRingPoints } from './geometry';
import { useKeyframeLoop } from './motion';
import { referenceValues } from './referenceValues';

export type DotRingProps = {
  size?: number;
  rings?: number;
  dots?: number;
  color?: string;
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
};

export function DotRing({ size = 170, rings = 7, dots = 30, color, children, style }: DotRingProps) {
  const theme = useTheme();
  const points = useMemo(() => dotRingPoints(size, rings, dots), [size, rings, dots]);
  const breathe = useKeyframeLoop(
    theme.motion.keyframes.breathe,
    referenceValues.dotRing.breatheMs,
    theme.motion.easing.easeLiquid,
    !theme.reducedMotion,
  );
  const fill = color ?? theme.color.dotRingStroke;

  return (
    <View style={[{ width: size, height: size }, style]}>
      <Animated.View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          { opacity: breathe.value('opacity'), transform: [{ scale: breathe.value('scale') }] },
        ]}
      >
        <Svg width={size} height={size}>
          {points.map((point, index) => (
            <Circle
              key={index}
              cx={point.x}
              cy={point.y}
              r={referenceValues.dotRing.dotRadius}
              fill={fill}
              opacity={point.opacity}
            />
          ))}
        </Svg>
      </Animated.View>
      <View style={[StyleSheet.absoluteFill, styles.centre]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  centre: { alignItems: 'center', justifyContent: 'center' },
});
