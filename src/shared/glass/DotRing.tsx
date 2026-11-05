import { useMemo, type ReactNode } from 'react';
import { Animated, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useTheme } from '@shared/theme';
import { dotRingBands } from './geometry';
import { useKeyframeWave } from './motion';
import { referenceValues } from './referenceValues';

export type DotRingProps = {
  size?: number;
  rings?: number;
  dots?: number;
  color?: string;
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
};

export function DotRing({
  size = referenceValues.dotRing.size,
  rings = referenceValues.dotRing.rings,
  dots = referenceValues.dotRing.dots,
  color,
  children,
  style,
}: DotRingProps) {
  const theme = useTheme();
  const bands = useMemo(() => dotRingBands(size, rings, dots), [size, rings, dots]);
  const wave = useKeyframeWave(
    theme.motion.keyframes.breathe,
    referenceValues.dotRing.breatheMs,
    theme.motion.easing.easeLiquid,
    !theme.reducedMotion,
    bands.length,
  );
  const fill = color ?? theme.color.dotRingStroke;

  return (
    <View style={[{ width: size, height: size }, style]}>
      <View
        pointerEvents="none"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={StyleSheet.absoluteFill}
      >
        {bands.map((band, ring) => (
          <Animated.View
            key={ring}
            style={[
              StyleSheet.absoluteFill,
              { opacity: wave.value(ring, 'opacity'), transform: [{ scale: wave.value(ring, 'scale') }] },
            ]}
          >
            <Svg width={size} height={size}>
              {band.map((point, index) => (
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
        ))}
      </View>
      <View style={[StyleSheet.absoluteFill, styles.centre]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  centre: { alignItems: 'center', justifyContent: 'center' },
});
