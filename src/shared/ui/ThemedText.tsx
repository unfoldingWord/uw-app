import type { ReactNode } from 'react';
import { Text, type StyleProp, type TextProps, type TextStyle } from 'react-native';
import { textSample, uiFont, uiText, useTheme, type TextRole, type Theme } from '@shared/theme';
import { prototypeValues } from './prototypeValues';

export type TextTone =
  'title' | 'body' | 'muted' | 'dim' | 'faint' | 'inverse' | 'onImage' | 'warm' | 'link' | 'accent';

export type TextFamily = 'core' | 'brand';

export type ThemedTextProps = Omit<TextProps, 'style' | 'children' | 'role'> & {
  variant?: TextRole;
  tone?: TextTone;
  family?: TextFamily;
  weight?: number;
  align?: 'auto' | 'center';
  live?: boolean;
  style?: StyleProp<TextStyle>;
  children?: ReactNode;
};

export function toneColor(theme: Theme, tone: TextTone): string {
  const colors: Record<TextTone, string> = {
    title: theme.color.textTitle,
    body: theme.color.textBody,
    muted: theme.color.textMuted,
    dim: theme.color.textDim,
    faint: theme.color.textFaint,
    inverse: theme.color.textOnInverse,
    onImage: theme.color.textOnImage,
    warm: theme.color.accentWarmText,
    link: theme.color.link,
    accent: theme.color.accentBlue,
  };
  return colors[tone];
}

function brandWeight(theme: Theme, role: TextRole): number {
  switch (role) {
    case 'hero':
    case 'cardTitle':
    case 'time':
      return prototypeValues.brandHeadingWeight;
    case 'overline':
      return theme.fontWeight.fwMedium;
    default:
      return theme.fontWeight.fwRegular;
  }
}

function familyFor(
  theme: Theme,
  family: TextFamily,
  weight: number | undefined,
  role: TextRole,
  sample: string | undefined,
) {
  const base = theme.text[role];
  if (family === 'brand') {
    return uiFont(theme, theme.fontStack.fontBrand, weight ?? brandWeight(theme, role), sample);
  }
  if (weight === undefined) {
    const font = uiText(theme, base, sample);
    return { fontFamily: font.fontFamily, fontWeight: font.fontWeight };
  }
  return uiFont(theme, theme.fontStack.fontCore, weight, sample);
}

export function ThemedText({
  variant = 'body',
  tone = 'body',
  family = 'core',
  weight,
  align = 'auto',
  live = false,
  style,
  children,
  ...rest
}: ThemedTextProps) {
  const theme = useTheme();
  const sample = textSample(children);
  const base = uiText(theme, theme.text[variant], sample);
  return (
    <Text
      accessibilityLiveRegion={live ? 'polite' : undefined}
      {...rest}
      style={[
        {
          fontSize: base.fontSize,
          lineHeight: base.lineHeight,
          letterSpacing: base.letterSpacing,
          textTransform: base.textTransform,
          color: toneColor(theme, tone),
          textAlign: align,
          writingDirection: 'auto',
        },
        familyFor(theme, family, weight, variant, sample),
        style,
      ]}
    >
      {children}
    </Text>
  );
}
