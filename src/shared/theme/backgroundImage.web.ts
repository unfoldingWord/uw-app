import type { ViewStyle } from 'react-native';

export function backgroundImage(gradient: string): ViewStyle {
  const style: Readonly<Record<string, string>> = { backgroundImage: gradient };
  return style as ViewStyle;
}
