import type { ReactNode } from 'react';
import { Animated, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme, type Theme } from '@shared/theme';
import { ContentColor } from './context';
import { GlassBlur } from './GlassBlur';
import { useKeyframeLoop } from './motion';
import { referenceValues } from './referenceValues';
import { shadowCss } from './shadows';
import { coreFont } from './typeface';
import { slopFor } from './pressGate';
import { usePress, type PressHandler } from './usePress';

export type GlassButtonVariant = 'glass' | 'solid' | 'dark' | 'night' | 'quiet';
export type GlassButtonSize = 'sm' | 'md' | 'lg';

type Named =
  { children: string; accessibilityLabel?: string } | { children?: ReactNode; accessibilityLabel: string };

export type GlassButtonProps = Named & {
  variant?: GlassButtonVariant;
  size?: GlassButtonSize;
  full?: boolean;
  leading?: ReactNode;
  trailing?: ReactNode;
  onPress?: PressHandler;
  disabled?: boolean;
  busy?: boolean;
  accessibilityHint?: string;
  testID?: string;
  style?: StyleProp<ViewStyle>;
};

type Treatment = {
  background: string;
  color: string;
  borderColor: string;
  borderWidth: number;
  boxShadow: string | undefined;
  blurred: boolean;
};

function treatment(theme: Theme, variant: GlassButtonVariant): Treatment {
  const hairline = referenceValues.glassButton.hairline;
  switch (variant) {
    case 'glass':
      return {
        background: theme.color.glassFill3,
        color: theme.color.textTitle,
        borderColor: theme.border.borderGlass.color,
        borderWidth: theme.border.borderGlass.width,
        boxShadow: shadowCss([theme.shadow.shadowRest, theme.shadow.innerTop]),
        blurred: false,
      };
    case 'solid':
      return {
        background: theme.color.paper000,
        color: theme.color.ink900,
        borderColor: referenceValues.glassButton.solidBorder,
        borderWidth: hairline,
        boxShadow: theme.shadow.shadowCard.css,
        blurred: false,
      };
    case 'dark':
      return {
        background: theme.color.surfaceInverse,
        color: theme.color.textOnInverse,
        borderColor: referenceValues.glassButton.darkBorder,
        borderWidth: hairline,
        boxShadow: theme.shadow.shadowCard.css,
        blurred: false,
      };
    case 'night':
      return {
        background: theme.color.glassFillNight,
        color: theme.color.onNight900,
        borderColor: theme.border.borderNight.color,
        borderWidth: theme.border.borderNight.width,
        boxShadow: theme.shadow.shadowNight.css,
        blurred: true,
      };
    case 'quiet':
      return {
        background: 'transparent',
        color: theme.color.textMuted,
        borderColor: 'transparent',
        borderWidth: hairline,
        boxShadow: undefined,
        blurred: false,
      };
  }
}

function fontSizeFor(theme: Theme, size: GlassButtonSize): number {
  return { sm: theme.fontSize.fsCaption, md: theme.fontSize.fsLabel, lg: theme.fontSize.fsBody }[size];
}

export function GlassButton({
  variant = 'glass',
  size = 'md',
  full = false,
  leading,
  trailing,
  children,
  onPress,
  disabled = false,
  busy = false,
  accessibilityLabel,
  accessibilityHint,
  testID,
  style,
}: GlassButtonProps) {
  const theme = useTheme();
  const look = treatment(theme, variant);
  const press = usePress(onPress, disabled || busy);
  const working = busy || press.pending;
  const inert = disabled || working;
  const pulse = useKeyframeLoop(
    theme.motion.keyframes.breathe,
    referenceValues.dotRing.breatheMs,
    theme.motion.easing.easeLiquid,
    working && !theme.reducedMotion,
  );
  const [vertical, horizontal] = referenceValues.glassButton.padding[size];
  const fontSize = fontSizeFor(theme, size);
  const slop = slopFor(2 * vertical + fontSize * referenceValues.glassButton.lineHeight);
  const label = typeof children === 'string' ? children : undefined;
  const focusGlow = press.focused ? theme.shadow.glowFocus.css : undefined;
  const lift = press.hovered && !inert ? theme.motion.hoverLift.translateY : 0;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: inert, busy: working }}
      disabled={inert}
      hitSlop={{ top: slop, bottom: slop }}
      testID={testID}
      {...press.handlers}
      style={[full ? styles.full : styles.hug, style]}
    >
      <Animated.View
        style={[
          styles.pill,
          {
            gap: theme.space.gapInline,
            paddingVertical: vertical,
            paddingHorizontal: horizontal,
            borderRadius: theme.radius.rPill,
            backgroundColor: look.blurred ? undefined : look.background,
            borderColor: look.borderColor,
            borderWidth: look.borderWidth,
            boxShadow: [look.boxShadow, focusGlow].filter(Boolean).join(', ') || undefined,
            opacity: disabled ? referenceValues.disabledOpacity : 1,
            transform: [{ scale: press.scale }, { translateY: lift }],
          },
        ]}
      >
        {look.blurred ? (
          <View
            pointerEvents="none"
            style={[StyleSheet.absoluteFill, { borderRadius: theme.radius.rPill, overflow: 'hidden' }]}
          >
            <GlassBlur blur={theme.blur.blurMedium} tone="night" radius={theme.radius.rPill} />
            <View style={[StyleSheet.absoluteFill, { backgroundColor: look.background }]} />
          </View>
        ) : null}
        <ContentColor color={look.color}>
          <Animated.View
            style={[styles.row, { gap: theme.space.gapInline, opacity: pulse.value('opacity') }]}
          >
            {leading}
            {label === undefined ? (
              children
            ) : (
              <Text
                style={{
                  ...coreFont(theme, theme.fontWeight.fwSemibold, label),
                  color: look.color,
                  fontSize,
                  lineHeight: fontSize * referenceValues.glassButton.lineHeight,
                  letterSpacing: theme.letterSpacing.lsBody * fontSize,
                }}
              >
                {label}
              </Text>
            )}
            {trailing}
          </Animated.View>
        </ContentColor>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hug: { alignSelf: 'flex-start' },
  full: { alignSelf: 'stretch' },
  pill: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
});
