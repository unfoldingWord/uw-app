import { BlurTargetView } from 'expo-blur';
import { useRef, useState, type ReactNode } from 'react';
import {
  Animated,
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useTheme } from '@shared/theme';
import { BlurTarget } from './context';
import { useKeyframeLoop } from './motion';
import { referenceValues } from './referenceValues';

export type AuroraFieldProps = {
  intensity?: number;
  drift?: boolean;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
};

export function AuroraField({ intensity = 1, drift = true, style, children }: AuroraFieldProps) {
  const theme = useTheme();
  const target = useRef<View | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const { insetPercent, driftMs } = referenceValues.auroraField;
  const moving = useKeyframeLoop(
    theme.motion.keyframes.drift,
    driftMs,
    theme.motion.easing.easeLiquid,
    drift && !theme.reducedMotion && size.width > 0,
  );
  const inset = `-${insetPercent}%` as const;
  const measure = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setSize({ width, height });
  };

  return (
    <View style={[styles.field, { backgroundColor: theme.color.surfaceApp }, style]}>
      <BlurTargetView ref={target} style={StyleSheet.absoluteFill} pointerEvents="none">
        <Animated.View
          onLayout={measure}
          style={{
            position: 'absolute',
            top: inset,
            bottom: inset,
            start: inset,
            end: inset,
            experimental_backgroundImage: theme.gradient.auroraField,
            opacity: intensity,
            transform: [
              { translateX: moving.value('translateXPercent', size.width / 100) },
              { translateY: moving.value('translateYPercent', size.height / 100) },
              { scale: moving.value('scale') },
            ],
          }}
        />
      </BlurTargetView>
      <BlurTarget target={target}>
        <View style={styles.content}>{children}</View>
      </BlurTarget>
    </View>
  );
}

const styles = StyleSheet.create({
  field: { flex: 1, overflow: 'hidden' },
  content: { flex: 1 },
});
