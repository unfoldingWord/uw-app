import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '@shared/theme';

export function StoryWell({ children }: { children?: ReactNode }) {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.well,
        {
          minHeight: theme.space.sp15 * 2 + theme.space.sp10,
          borderRadius: theme.radius.rLg,
          backgroundColor: theme.color.uwOcean,
          padding: theme.space.sp8,
        },
      ]}
    >
      <View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, { experimental_backgroundImage: theme.gradient.refraction }]}
      />
      <View style={{ gap: theme.space.sp2 }}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  well: { overflow: 'hidden', justifyContent: 'flex-end' },
});
