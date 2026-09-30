import type { ReactNode } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '@shared/theme';
import { ContentColor } from './context';
import { GlassBlur } from './GlassBlur';
import { referenceValues } from './referenceValues';
import { coreFont } from './typeface';

export type GlassChipProps = {
  leading?: ReactNode;
  tone?: 'light' | 'night' | 'bare';
  size?: 'sm' | 'md';
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
};

export function GlassChip({ leading, tone = 'light', size = 'md', children, style }: GlassChipProps) {
  const theme = useTheme();
  const night = tone === 'night';
  const bare = tone === 'bare';
  const reference = referenceValues.glassChip;
  const [vertical, horizontal] = reference.padding[bare ? 'bare' : size];
  const color = night ? theme.color.onNight900 : theme.color.textMuted;
  const fontSize = size === 'sm' ? theme.fontSize.fsOverline : theme.fontSize.fsMicro;
  const pill = theme.radius.rPill;

  return (
    <View
      style={[
        styles.row,
        {
          gap: theme.space.sp3,
          paddingVertical: vertical,
          paddingHorizontal: horizontal,
          borderRadius: pill,
          borderColor: night ? reference.nightBorder : theme.border.borderGlass.color,
          borderWidth: bare ? 0 : night ? reference.hairline : theme.border.borderGlass.width,
        },
        style,
      ]}
    >
      {bare ? null : (
        <View
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, { borderRadius: pill, overflow: 'hidden' }]}
        >
          <GlassBlur blur={theme.blur.blurSoft} tone={night ? 'night' : 'light'} radius={pill} />
          <View
            style={[
              StyleSheet.absoluteFill,
              { backgroundColor: night ? reference.nightFill : theme.color.glassFill3 },
            ]}
          />
        </View>
      )}
      <ContentColor color={color}>
        {leading}
        {typeof children === 'string' ? (
          <Text
            style={{
              ...coreFont(theme, theme.fontWeight.fwMedium, children),
              color,
              fontSize,
              lineHeight: fontSize * reference.lineHeight,
              letterSpacing: fontSize * reference.letterSpacingEm,
            }}
          >
            {children}
          </Text>
        ) : (
          children
        )}
      </ContentColor>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start' },
});
