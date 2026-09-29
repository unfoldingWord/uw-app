import { useState, type ReactNode } from 'react';
import {
  StyleSheet,
  TextInput,
  View,
  type NativeSyntheticEvent,
  type StyleProp,
  type TargetedEvent,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { useTheme } from '@shared/theme';
import { ContentColor } from './context';
import { GlassBlur } from './GlassBlur';
import { referenceValues } from './referenceValues';
import { shadowCss } from './shadows';

export type GlassInputProps = Omit<TextInputProps, 'style' | 'accessibilityLabel'> & {
  accessibilityLabel: string;
  placeholder?: string;
  leading?: ReactNode;
  trailing?: ReactNode;
  height?: number;
  style?: StyleProp<ViewStyle>;
};

export function GlassInput({
  leading,
  trailing,
  height = referenceValues.glassInput.height,
  style,
  onFocus,
  onBlur,
  editable = true,
  ...input
}: GlassInputProps) {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);
  const pill = theme.radius.rPill;
  const boxShadow = shadowCss([
    theme.shadow.shadowRest,
    theme.shadow.innerTop,
    focused ? theme.shadow.glowFocus : undefined,
  ]);

  return (
    <View
      style={[
        styles.row,
        {
          minHeight: height,
          gap: theme.space.sp6,
          paddingHorizontal: theme.space.sp9,
          borderRadius: pill,
          borderColor: theme.border.borderGlass.color,
          borderWidth: theme.border.borderGlass.width,
          boxShadow,
          opacity: editable ? 1 : referenceValues.disabledOpacity,
        },
        style,
      ]}
    >
      <View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, { borderRadius: pill, overflow: 'hidden' }]}
      >
        <GlassBlur blur={theme.blur.blurStrong} tone="light" radius={pill} />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.color.glassFill2 }]} />
      </View>
      <ContentColor color={theme.color.textMuted}>
        {leading}
        <TextInput
          {...input}
          editable={editable}
          placeholderTextColor={editable ? theme.color.textMuted : theme.color.textDim}
          onFocus={(event: NativeSyntheticEvent<TargetedEvent>) => {
            setFocused(true);
            onFocus?.(event);
          }}
          onBlur={(event: NativeSyntheticEvent<TargetedEvent>) => {
            setFocused(false);
            onBlur?.(event);
          }}
          style={[
            styles.field,
            {
              fontFamily: theme.text.body.fontFamily,
              fontSize: theme.text.body.fontSize,
              color: theme.color.textTitle,
              textAlign: 'auto',
            },
          ]}
        />
        {trailing}
      </ContentColor>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  field: { flex: 1, minWidth: 0, padding: 0 },
});
