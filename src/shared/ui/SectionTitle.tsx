import { View } from 'react-native';
import { useTheme } from '@shared/theme';
import { ThemedText } from './ThemedText';

export type SectionTitleProps = { children: string; trailing?: string; brand?: boolean };

export function SectionTitle({ children, trailing, brand = false }: SectionTitleProps) {
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
      <ThemedText
        variant="overline"
        tone={brand ? 'accent' : 'dim'}
        family={brand ? 'brand' : 'core'}
        accessibilityRole="header"
      >
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
