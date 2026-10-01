import type { ReactNode } from 'react';
import { Text, type StyleProp, type TextStyle } from 'react-native';
import { textSample, uiFont, uiText, useTheme, type TextRole, type Theme } from '@shared/theme';

export type Tone = 'title' | 'body' | 'muted' | 'dim' | 'faint' | 'link' | 'warm';

export type Weight = 'regular' | 'medium' | 'semibold';

export type SayProps = {
  role?: TextRole;
  tone?: Tone;
  weight?: Weight;
  selectable?: boolean;
  lines?: number;
  live?: boolean;
  style?: StyleProp<TextStyle>;
  children?: ReactNode;
};

export function toneColor(theme: Theme, tone: Tone): string {
  const colors: Record<Tone, string> = {
    title: theme.color.textTitle,
    body: theme.color.textBody,
    muted: theme.color.textMuted,
    dim: theme.color.textDim,
    faint: theme.color.textFaint,
    link: theme.color.link,
    warm: theme.color.accentWarmText,
  };
  return colors[tone];
}

function weightOf(theme: Theme, weight: Weight): number {
  const weights: Record<Weight, number> = {
    regular: theme.fontWeight.fwRegular,
    medium: theme.fontWeight.fwMedium,
    semibold: theme.fontWeight.fwSemibold,
  };
  return weights[weight];
}

export function roleStyle(
  theme: Theme,
  role: TextRole,
  weight: Weight | undefined,
  sample: string | undefined,
): TextStyle {
  const base = uiText(theme, theme.text[role], sample);
  if (weight === undefined) {
    return base;
  }
  return {
    ...base,
    fontWeight: undefined,
    ...uiFont(theme, theme.fontStack.fontCore, weightOf(theme, weight), sample),
  };
}

export function Say({
  role = 'body',
  tone = 'body',
  weight,
  selectable,
  lines,
  live = false,
  style,
  children,
}: SayProps) {
  const theme = useTheme();
  return (
    <Text
      selectable={selectable}
      numberOfLines={lines}
      accessibilityLiveRegion={live ? 'polite' : undefined}
      style={[roleStyle(theme, role, weight, textSample(children)), { color: toneColor(theme, tone) }, style]}
    >
      {children}
    </Text>
  );
}
