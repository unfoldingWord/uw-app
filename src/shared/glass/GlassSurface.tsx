import type { ReactNode } from 'react';
import { Animated, StyleSheet, View, type StyleProp, type ViewProps, type ViewStyle } from 'react-native';
import { useTheme, type Theme } from '@shared/theme';
import { ContentColor } from './context';
import { GlassBlur } from './GlassBlur';
import { useKeyframeLoop } from './motion';
import { referenceValues } from './referenceValues';
import { splitShadows } from './shadows';

export type GlassLevel = 1 | 2 | 3 | 4;
export type GlassBlurStep = 'sheer' | 'soft' | 'medium' | 'strong' | 'heavy';
export type GlassRadius = 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'pill' | number;
export type GlassShadow = 'none' | 'rest' | 'card' | 'float';

export type GlassSurfaceProps = Omit<ViewProps, 'style' | 'children'> & {
  level?: GlassLevel;
  blur?: GlassBlurStep;
  radius?: GlassRadius;
  shadow?: GlassShadow;
  tone?: 'light' | 'night';
  refraction?: boolean;
  float?: boolean;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
};

function radiusValue(theme: Theme, radius: GlassRadius): number {
  if (typeof radius === 'number') {
    return radius;
  }
  const radii: Record<Exclude<GlassRadius, number>, number> = {
    sm: theme.radius.rSm,
    md: theme.radius.rMd,
    lg: theme.radius.rLg,
    xl: theme.radius.rXl,
    '2xl': theme.radius.r2xl,
    pill: theme.radius.rPill,
  };
  return radii[radius];
}

function blurValue(theme: Theme, blur: GlassBlurStep) {
  const steps = {
    sheer: theme.blur.blurSheer,
    soft: theme.blur.blurSoft,
    medium: theme.blur.blurMedium,
    strong: theme.blur.blurStrong,
    heavy: theme.blur.blurHeavy,
  };
  return steps[blur];
}

function fillFor(theme: Theme, level: GlassLevel, night: boolean): string {
  if (night) {
    return level >= 3 ? theme.color.glassFillNightStrong : theme.color.glassFillNight;
  }
  const fills = {
    1: theme.color.glassFill1,
    2: theme.color.glassFill2,
    3: theme.color.glassFill3,
    4: theme.color.glassFill4,
  };
  return fills[level];
}

function shadowFor(theme: Theme, shadow: GlassShadow, night: boolean) {
  if (night) {
    return splitShadows([theme.shadow.shadowNight, theme.shadow.innerTopNight]);
  }
  const outer = {
    none: undefined,
    rest: theme.shadow.shadowRest,
    card: theme.shadow.shadowCard,
    float: theme.shadow.shadowFloat,
  };
  return splitShadows([outer[shadow], theme.shadow.innerTop, theme.shadow.innerEdge]);
}

export function GlassSurface({
  level = 2,
  blur = 'medium',
  radius = 'xl',
  shadow = 'card',
  tone = 'light',
  refraction = true,
  float = false,
  style,
  children,
  ...rest
}: GlassSurfaceProps) {
  const theme = useTheme();
  const night = tone === 'night';
  const corner = radiusValue(theme, radius);
  const border = night ? theme.border.borderNight : theme.border.borderGlass;
  const shadows = shadowFor(theme, shadow, night);
  const floating = useKeyframeLoop(
    theme.motion.keyframes.float,
    theme.motion.duration.floatCycle,
    theme.motion.easing.easeLiquid,
    float && !theme.reducedMotion,
  );
  const color = night ? theme.color.textOnNight : theme.color.textBody;

  return (
    <Animated.View
      {...rest}
      style={[
        {
          borderRadius: corner,
          borderWidth: border.width,
          borderColor: border.color,
          boxShadow: shadows.outset,
          transform: [{ translateY: floating.value('translateY') }],
        },
        style,
      ]}
    >
      <View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, { borderRadius: corner, overflow: 'hidden' }]}
      >
        <GlassBlur blur={blurValue(theme, blur)} tone={tone} radius={corner} />
        <View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: fillFor(theme, level, night), boxShadow: shadows.inset },
          ]}
        />
        {refraction ? (
          <View
            style={[
              StyleSheet.absoluteFill,
              {
                experimental_backgroundImage: night
                  ? theme.gradient.refractionNight
                  : theme.gradient.refraction,
                opacity: night ? 1 : referenceValues.glassSurface.refractionOpacity,
              },
            ]}
          />
        ) : null}
      </View>
      <ContentColor color={color}>{children}</ContentColor>
    </Animated.View>
  );
}
