import { View } from 'react-native';
import { useTheme } from '@shared/theme';
import { ThemedText } from './ThemedText';

export type SectionTitleProps = { children: string; trailing?: string };

export function SectionTitle({ children, trailing }: SectionTitleProps) {
  const theme = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: theme.space.sp4,
        paddingHorizontal: theme.space.sp2,
      }}
    >
      <ThemedText variant="overline" tone="dim" accessibilityRole="header">
        {children}
      </ThemedText>
      {trailing === undefined ? null : (
        <ThemedText variant="caption" tone="title">
          {trailing}
        </ThemedText>
      )}
    </View>
  );
}
