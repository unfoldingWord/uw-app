import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { GlassSurface, type GlassLevel } from '@shared/glass';
import { useTheme } from '@shared/theme';
import { Line } from './Line';

export type CardProps = {
  level?: GlassLevel;
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
};

export function Card({ level = 2, children, style }: CardProps) {
  const theme = useTheme();
  return (
    <GlassSurface
      level={level}
      blur={level === 1 ? 'soft' : 'strong'}
      shadow={level === 1 ? 'none' : 'rest'}
      style={[{ padding: theme.space.gutterCard, gap: theme.space.sp4 }, style]}
    >
      {children}
    </GlassSurface>
  );
}

export function SectionTitle({ children, brand = false }: { children: string; brand?: boolean }) {
  const theme = useTheme();
  return (
    <Line
      role="overline"
      tone={brand ? 'accent' : 'dim'}
      brand={brand}
      accessibilityRole="header"
      style={{ paddingTop: theme.space.sp3 }}
    >
      {children}
    </Line>
  );
}
