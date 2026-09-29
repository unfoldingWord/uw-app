import type { ReactNode } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { useTheme } from '@shared/theme';
import { prototypeValues } from '@shared/ui';

export type PictureWellProps = { label?: string; uri?: string; tall?: boolean; children?: ReactNode };

export function PictureWell({ label, uri, tall = false, children }: PictureWellProps) {
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
      {uri === undefined ? null : (
        <>
          <Image
            source={{ uri }}
            resizeMode="cover"
            accessibilityElementsHidden
            importantForAccessibility="no"
            style={StyleSheet.absoluteFill}
          />
          <View
            pointerEvents="none"
            style={[
              StyleSheet.absoluteFill,
              { experimental_backgroundImage: prototypeValues.imageProtection },
            ]}
          />
        </>
      )}
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
