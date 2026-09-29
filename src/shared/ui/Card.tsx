import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { GlassSurface, type GlassLevel, type GlassShadow } from '@shared/glass';
import { useTheme } from '@shared/theme';
import { Tappable, type TapTarget } from './Tappable';

export type CardPadding = 'card' | 'tight' | 'none';

export type CardProps = {
  padding?: CardPadding;
  level?: GlassLevel;
  shadow?: GlassShadow;
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
  press?: TapTarget;
};

export function Card({
  padding = 'card',
  level = 2,
  shadow = 'card',
  compact = false,
  style,
  children,
  press,
}: CardProps) {
  const theme = useTheme();
  const radius = compact ? theme.radius.rLg : theme.radius.rXl;
  const inner = {
    card: theme.space.gutterCard,
    tight: theme.space.sp5,
    none: 0,
  }[padding];
  const surface = (
    <GlassSurface
      level={level}
      blur="strong"
      radius={radius}
      shadow={shadow}
      style={[{ padding: inner, gap: theme.space.sp4 }, style]}
    >
      {children}
    </GlassSurface>
  );
  if (press === undefined) {
    return surface;
  }
  return (
    <Tappable {...press} radius={radius}>
      {() => surface}
    </Tappable>
  );
}
