import type { ReactNode } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { backgroundImage, useTheme } from '@shared/theme';
import { prototypeValues } from '@shared/ui';

export type StoryWellProps = { image?: string; label?: string; children?: ReactNode };

export function StoryWell({ image, label, children }: StoryWellProps) {
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
      {image === undefined ? null : (
        <>
          <Image
            source={{ uri: image }}
            resizeMode="cover"
            accessible={label !== undefined}
            accessibilityRole="image"
            accessibilityLabel={label}
            style={StyleSheet.absoluteFill}
          />
          <View
            pointerEvents="none"
            style={[StyleSheet.absoluteFill, backgroundImage(prototypeValues.imageProtection)]}
          />
        </>
      )}
      <View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, backgroundImage(theme.gradient.refraction)]}
      />
      <View style={{ gap: theme.space.sp2 }}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  well: { overflow: 'hidden', justifyContent: 'flex-end' },
});
