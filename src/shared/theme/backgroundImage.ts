import type { ViewStyle } from 'react-native';

export function backgroundImage(gradient: string): ViewStyle {
  return { experimental_backgroundImage: gradient };
}
