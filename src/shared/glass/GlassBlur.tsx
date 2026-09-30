import { BlurView, type BlurTint } from 'expo-blur';
import { Platform, StyleSheet } from 'react-native';
import { useTheme, type Blur } from '@shared/theme';
import { useBlurTarget } from './context';

export type GlassBlurProps = { blur: Blur; tone: 'light' | 'night'; radius: number };

export function GlassBlur({ blur, tone, radius }: GlassBlurProps) {
  const theme = useTheme();
  const target = useBlurTarget();
  if (theme.reducedBlur || blur.intensity === 0) {
    return null;
  }
  if (Platform.OS === 'android' && target === undefined) {
    return null;
  }
  const tint: BlurTint =
    tone === 'night' || theme.scheme === 'dark'
      ? 'systemUltraThinMaterialDark'
      : 'systemUltraThinMaterialLight';
  return (
    <BlurView
      intensity={blur.intensity}
      tint={tint}
      blurTarget={target}
      blurMethod="dimezisBlurViewSdk31Plus"
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, { borderRadius: radius, overflow: 'hidden' }]}
    />
  );
}
