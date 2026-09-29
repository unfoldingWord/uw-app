import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '@shared/theme';

export type PictureWellProps = { label?: string; tall?: boolean; children?: ReactNode };

export function PictureWell({ label, tall = false, children }: PictureWellProps) {
  const theme = useTheme();
  return (
    <View
      accessible={label !== undefined}
      accessibilityRole={label === undefined ? undefined : 'image'}
      accessibilityLabel={label}
      style={[
        styles.well,
        {
          minHeight: tall ? theme.space.sp15 * 3 : theme.space.sp15 * 2,
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
