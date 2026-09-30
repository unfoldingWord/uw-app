import { StyleSheet, View } from 'react-native';
import { useTheme, type Theme } from '@shared/theme';
import { prototypeValues } from './prototypeValues';
import { ThemedText } from './ThemedText';

export type DotTone = 'ready' | 'attention' | 'progress';

export function dotColor(theme: Theme, tone: DotTone): string {
  const colors: Record<DotTone, string> = {
    ready: theme.color.accentTeal,
    attention: theme.color.accentWarm,
    progress: theme.color.accentBlue,
  };
  return colors[tone];
}

export type DotProps = { tone: DotTone; size?: number };

export function Dot({ tone, size = prototypeValues.dot }: DotProps) {
  const theme = useTheme();
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        width: size,
        height: size,
        borderRadius: theme.radius.rPill,
        backgroundColor: dotColor(theme, tone),
      }}
    />
  );
}

export type BadgeProps = { label: string; tone?: DotTone };

export function Badge({ label, tone = 'ready' }: BadgeProps) {
  const theme = useTheme();
  const hairline = theme.border.borderHairline;
  return (
    <View
      style={[
        styles.row,
        {
          gap: theme.space.sp2,
          paddingVertical: theme.space.sp3,
          paddingHorizontal: theme.space.sp4,
          borderRadius: theme.radius.rPill,
          borderWidth: hairline.width,
          borderColor: hairline.color,
        },
      ]}
    >
      <Dot tone={tone} size={prototypeValues.badgeDot} />
      <ThemedText variant="caption" tone="dim" weight={theme.fontWeight.fwMedium}>
        {label}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', flexShrink: 0 },
});
