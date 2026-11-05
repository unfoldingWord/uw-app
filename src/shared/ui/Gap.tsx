import { View } from 'react-native';

export type GapProps = { size: number };

export function Gap({ size }: GapProps) {
  return <View style={{ height: size }} />;
}
