import type { ReactNode } from 'react';
import { Text, type StyleProp, type TextProps, type TextStyle } from 'react-native';
import { fontFor } from '@shared/fonts/families';
import { useTheme, type TextRole, type Theme } from '@shared/theme';

export type TextTone = 'title' | 'body' | 'muted' | 'dim' | 'faint' | 'inverse' | 'onImage' | 'warm' | 'link';

export type TextFamily = 'core' | 'brand';

export type ThemedTextProps = Omit<TextProps, 'style' | 'children' | 'role'> & {
  variant?: TextRole;
  tone?: TextTone;
  family?: TextFamily;
  weight?: number;
  align?: 'auto' | 'center';
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
  };
  return colors[tone];
}

function familyFor(theme: Theme, family: TextFamily, weight: number | undefined, role: TextRole) {
  const base = theme.text[role];
  if (family === 'brand') {
    return fontFor(theme.fontStack.fontBrand, weight ?? Number(base.fontWeight ?? 400)) ?? {};
  }
  if (weight === undefined) {
    return { fontFamily: base.fontFamily, fontWeight: base.fontWeight };
  }
  return fontFor(theme.fontStack.fontCore, weight) ?? {};
}

export function ThemedText({
  variant = 'body',
  tone = 'body',
  family = 'core',
  weight,
  align = 'auto',
  style,
  children,
  ...rest
}: ThemedTextProps) {
  const theme = useTheme();
  const base = theme.text[variant];
  return (
    <Text
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
        familyFor(theme, family, weight, variant),
        style,
      ]}
    >
      {children}
    </Text>
  );
}
