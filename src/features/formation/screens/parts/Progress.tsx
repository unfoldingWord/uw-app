import { View } from 'react-native';
import { useTheme } from '@shared/theme';

export function Progress({ fraction, label }: { fraction: number; label: string }) {
  const theme = useTheme();
  const clamped = Math.max(0, Math.min(1, fraction));
  const height = theme.space.sp2;
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped * 100) }}
      style={{
        height,
        borderRadius: theme.radius.rPill,
        backgroundColor: theme.color.dotRingStroke,
        overflow: 'hidden',
        marginTop: theme.space.sp3,
      }}
    >
      <View
        style={{
          width: `${clamped * 100}%`,
          height,
          borderRadius: theme.radius.rPill,
          backgroundColor: theme.color.accentBlue,
        }}
      />
    </View>
  );
}
