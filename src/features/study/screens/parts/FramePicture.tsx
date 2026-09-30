import { Image, StyleSheet, View } from 'react-native';
import { backgroundImage, useTheme } from '@shared/theme';

export type FramePictureProps = { uri: string | undefined; label: string };

export function FramePicture({ uri, label }: FramePictureProps) {
  const theme = useTheme();
  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={label}
      style={[
        styles.well,
        {
          minHeight: theme.space.sp15 * 3,
          borderRadius: theme.radius.rLg,
          backgroundColor: theme.color.uwOcean,
        },
      ]}
    >
      {uri === undefined ? null : (
        <Image source={{ uri }} resizeMode="cover" style={StyleSheet.absoluteFill} />
      )}
      <View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, backgroundImage(theme.gradient.refraction)]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  well: { overflow: 'hidden' },
});
