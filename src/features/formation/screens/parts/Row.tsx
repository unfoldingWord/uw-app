import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { GlassSurface, Icon } from '@shared/glass';
import { useTheme } from '@shared/theme';
import { Line } from './Line';

export type RowProps = {
  title: string;
  detail?: string;
  leading?: ReactNode;
  trailing?: ReactNode;
  below?: ReactNode;
  selected?: boolean;
  hint?: string;
  onPress?: () => unknown;
};

export function Row({ title, detail, leading, trailing, below, selected, hint, onPress }: RowProps) {
  const theme = useTheme();
  const [busy, setBusy] = useState(false);
  const [focused, setFocused] = useState(false);
  const press = async () => {
    if (busy || onPress === undefined) {
      return;
    }
    setBusy(true);
    try {
      await onPress();
    } finally {
      setBusy(false);
    }
  };
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={detail === undefined ? title : `${title}, ${detail}`}
      accessibilityHint={hint}
      accessibilityState={{ busy, selected: selected === true, disabled: onPress === undefined }}
      disabled={onPress === undefined}
      onPress={() => void press()}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={({ pressed }) => ({ transform: [{ scale: pressed ? theme.motion.pressScale : 1 }] })}
    >
      <GlassSurface
        level={2}
        blur="strong"
        radius="lg"
        shadow="rest"
        style={[
          styles.row,
          { gap: theme.space.sp7, padding: theme.space.sp7 },
          focused ? { boxShadow: theme.shadow.glowFocus.css } : null,
        ]}
      >
        {leading}
        <View style={[styles.text, { gap: theme.space.sp1 }]}>
          <Line role="body" tone="title" weight={theme.fontWeight.fwSemibold}>
            {title}
          </Line>
          {detail === undefined ? null : (
            <Line role="caption" tone="body">
              {detail}
            </Line>
          )}
          {below}
        </View>
        {trailing ?? (onPress === undefined ? null : <Icon name="chevronRight" size={theme.space.sp8} />)}
      </GlassSurface>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  text: { flex: 1, minWidth: 0 },
});
