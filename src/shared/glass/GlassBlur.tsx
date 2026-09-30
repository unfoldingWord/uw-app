import { BlurView, type BlurTint } from 'expo-blur';
import { Platform, StyleSheet } from 'react-native';
import { useTheme, type Blur } from '@shared/theme';
import { blurRenders } from './blurLayers';
import { useBlurTarget, useInsideGlass } from './context';

export type GlassBlurProps = { blur: Blur; tone: 'light' | 'night'; radius: number };

export function GlassBlur({ blur, tone, radius }: GlassBlurProps) {
  const theme = useTheme();
  const target = useBlurTarget();
  const insideGlass = useInsideGlass();
  const renders = blurRenders({
    reducedBlur: theme.reducedBlur,
    intensity: blur.intensity,
    platform: Platform.OS,
    hasTarget: target !== undefined,
    insideGlass,
  });
  if (!renders) {
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
