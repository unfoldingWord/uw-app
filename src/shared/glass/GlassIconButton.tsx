import type { ReactNode } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  View,
  type GestureResponderEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useTheme, type Theme } from '@shared/theme';
import { ContentColor } from './context';
import { GlassBlur } from './GlassBlur';
import { useKeyframeLoop } from './motion';
import { referenceValues } from './referenceValues';
import { shadowCss } from './shadows';
import { usePress } from './usePress';

export type GlassIconButtonTone = 'light' | 'dark' | 'night';

export type GlassIconButtonProps = {
  size?: number;
  tone?: GlassIconButtonTone;
  label: string;
  children?: ReactNode;
  onPress?: (event: GestureResponderEvent) => void;
  disabled?: boolean;
  busy?: boolean;
  accessibilityHint?: string;
  testID?: string;
  style?: StyleProp<ViewStyle>;
};

function look(theme: Theme, tone: GlassIconButtonTone, glowing: boolean) {
  if (tone === 'dark') {
    return {
      background: theme.color.surfaceInverse,
      color: theme.color.textOnInverse,
      borderColor: referenceValues.glassIconButton.darkBorder,
      borderWidth: referenceValues.glassButton.hairline,
      boxShadow: shadowCss([theme.shadow.shadowNight, glowing ? theme.shadow.glowFocus : undefined]),
    };
  }
  if (tone === 'night') {
    return {
      background: theme.color.glassFillNight,
      color: theme.color.onNight900,
      borderColor: theme.border.borderNight.color,
      borderWidth: theme.border.borderNight.width,
      boxShadow: shadowCss([theme.shadow.shadowNight, glowing ? theme.shadow.glowFocus : undefined]),
    };
  }
  return {
    background: theme.color.glassFill3,
    color: theme.color.textBody,
    borderColor: theme.border.borderGlass.color,
    borderWidth: theme.border.borderGlass.width,
    boxShadow: shadowCss([
      theme.shadow.shadowRest,
      theme.shadow.innerTop,
      glowing ? theme.shadow.glowFocus : undefined,
    ]),
  };
}

export function GlassIconButton({
  size = referenceValues.glassIconButton.size,
  tone = 'light',
  label,
  children,
  onPress,
  disabled = false,
  busy = false,
  accessibilityHint,
  testID,
  style,
}: GlassIconButtonProps) {
  const theme = useTheme();
  const inert = disabled || busy;
  const press = usePress(onPress, inert);
  const glowing = press.focused || (press.hovered && !inert);
  const treatment = look(theme, tone, glowing);
  const pulse = useKeyframeLoop(
    theme.motion.keyframes.breathe,
    referenceValues.dotRing.breatheMs,
    theme.motion.easing.easeLiquid,
    busy && !theme.reducedMotion,
  );
  const lift = press.hovered && !inert ? theme.motion.hoverLift.translateY : 0;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: inert, busy }}
      disabled={inert}
      testID={testID}
      {...press.handlers}
      style={[styles.hug, style]}
    >
      <Animated.View
        style={[
          styles.circle,
          {
            width: size,
            height: size,
            borderRadius: theme.radius.rPill,
            borderColor: treatment.borderColor,
            borderWidth: treatment.borderWidth,
            boxShadow: treatment.boxShadow,
            opacity: disabled ? referenceValues.disabledOpacity : 1,
            transform: [{ scale: press.scale }, { translateY: lift }],
          },
        ]}
      >
        <View
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, { borderRadius: theme.radius.rPill, overflow: 'hidden' }]}
        >
          <GlassBlur
            blur={theme.blur.blurMedium}
            tone={tone === 'light' ? 'light' : 'night'}
            radius={theme.radius.rPill}
          />
          <View style={[StyleSheet.absoluteFill, { backgroundColor: treatment.background }]} />
        </View>
        <ContentColor color={treatment.color}>
          <Animated.View style={{ opacity: pulse.value('opacity') }}>{children}</Animated.View>
        </ContentColor>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hug: { alignSelf: 'flex-start', flexShrink: 0 },
  circle: { alignItems: 'center', justifyContent: 'center' },
});
