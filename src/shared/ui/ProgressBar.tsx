import { View } from 'react-native';
import { useTheme } from '@shared/theme';
import { prototypeValues } from './prototypeValues';

export type ProgressBarProps = { percent: number; accessibilityLabel: string };

export function ProgressBar({ percent, accessibilityLabel }: ProgressBarProps) {
  const theme = useTheme();
  const clamped = Math.max(0, Math.min(100, Math.round(percent)));
  const height = prototypeValues.progress.height;
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min: 0, max: 100, now: clamped }}
      style={{
        height,
        borderRadius: theme.radius.rPill,
        backgroundColor: theme.border.borderHairline.color,
        overflow: 'hidden',
      }}
    >
      <View
        style={{
          width: `${clamped}%`,
          height,
          borderRadius: theme.radius.rPill,
          backgroundColor: theme.color.accentBlue,
        }}
      />
    </View>
  );
}
