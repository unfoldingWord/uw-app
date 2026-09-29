import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '@shared/theme';
import { Dot, type DotTone } from './Badge';
import { ThemedText } from './ThemedText';

export type NoticeProps = { text: string; tone?: DotTone; action?: ReactNode };

export function Notice({ text, tone = 'attention', action }: NoticeProps) {
  const theme = useTheme();
  return (
    <View
      accessibilityRole={tone === 'attention' ? 'alert' : 'text'}
      accessibilityLiveRegion="polite"
      style={[styles.row, { gap: theme.space.sp4 }]}
    >
      <View style={{ paddingTop: theme.space.sp2 }}>
        <Dot tone={tone} />
      </View>
      <View style={[styles.text, { gap: theme.space.sp4 }]}>
        <ThemedText variant="caption" tone={tone === 'attention' ? 'warm' : 'body'}>
          {text}
        </ThemedText>
        {action}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start' },
  text: { flex: 1, minWidth: 0 },
});
