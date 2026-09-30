import type { ReactNode } from 'react';
import { Text, type AccessibilityRole, type StyleProp, type TextStyle } from 'react-native';
import { textSample, uiFont, uiText, useTheme, type TextRole, type Theme } from '@shared/theme';

export type Tone = 'title' | 'body' | 'muted' | 'dim' | 'faint' | 'onImage' | 'onInverse' | 'accent' | 'link';

export type LineProps = {
  role?: TextRole;
  tone?: Tone;
  weight?: number;
  children?: ReactNode;
  lines?: number;
  accessibilityRole?: AccessibilityRole;
  live?: boolean;
  brand?: boolean;
  style?: StyleProp<TextStyle>;
};

function colorOf(theme: Theme, tone: Tone): string {
  switch (tone) {
    case 'title':
      return theme.color.textTitle;
    case 'body':
      return theme.color.textBody;
    case 'muted':
      return theme.color.textMuted;
    case 'dim':
      return theme.color.textDim;
    case 'faint':
      return theme.color.textFaint;
    case 'onImage':
      return theme.color.textOnImage;
    case 'onInverse':
      return theme.color.textOnInverse;
    case 'accent':
      return theme.color.accentBlue;
    case 'link':
      return theme.color.link;
  }
}

const brandHeadingWeight = 900;

function brandWeight(theme: Theme, role: TextRole): number {
  switch (role) {
    case 'hero':
    case 'cardTitle':
    case 'time':
      return brandHeadingWeight;
    case 'overline':
      return theme.fontWeight.fwMedium;
    default:
      return theme.fontWeight.fwRegular;
  }
}

export function Line({
  role = 'body',
  tone = 'body',
  weight,
  children,
  lines,
  accessibilityRole,
  live = false,
  brand = false,
  style,
}: LineProps) {
  const theme = useTheme();
  const sample = textSample(children);
  const text = uiText(theme, theme.text[role], sample);
  const family = brand
    ? uiFont(theme, theme.fontStack.fontBrand, weight ?? brandWeight(theme, role), sample)
    : weight === undefined
      ? undefined
      : uiFont(theme, theme.fontStack.fontCore, weight, sample);
  return (
    <Text
      accessibilityRole={accessibilityRole}
      accessibilityLiveRegion={live ? 'polite' : undefined}
      numberOfLines={lines}
      style={[text, family, { color: colorOf(theme, tone) }, style]}
    >
      {children}
    </Text>
  );
}
