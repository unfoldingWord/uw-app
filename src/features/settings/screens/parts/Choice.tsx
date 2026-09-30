import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Icon } from '@shared/glass';
import { useTheme } from '@shared/theme';
import { Line } from './Line';

export type ChoiceProps = {
  label: string;
  detail?: string;
  selected: boolean;
  onPress: () => unknown;
  direction?: 'ltr' | 'rtl';
};

export function Choice({ label, detail, selected, onPress, direction }: ChoiceProps) {
  const theme = useTheme();
  const [busy, setBusy] = useState(false);
  const [focused, setFocused] = useState(false);
  const choose = async () => {
    if (busy || selected) {
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
      accessibilityRole="radio"
      accessibilityLabel={detail === undefined ? label : `${label}, ${detail}`}
      accessibilityState={{ checked: selected, busy }}
      hitSlop={{ top: theme.space.sp2, bottom: theme.space.sp2 }}
      onPress={() => void choose()}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={({ pressed }) => [
        styles.row,
        {
          gap: theme.space.sp4,
          paddingVertical: theme.space.sp4,
          paddingHorizontal: theme.space.sp7,
          borderRadius: theme.radius.rPill,
          borderWidth: theme.border.borderHairline.width,
          borderColor: theme.border.borderHairline.color,
          backgroundColor: selected ? theme.color.glassFill4 : 'transparent',
          transform: [{ scale: pressed ? theme.motion.pressScale : 1 }],
        },
        focused ? { boxShadow: theme.shadow.glowFocus.css } : null,
      ]}
    >
      <View style={styles.text}>
        <Line
          role="label"
          tone="title"
          weight={selected ? theme.fontWeight.fwSemibold : theme.fontWeight.fwMedium}
          style={direction === undefined ? undefined : { writingDirection: direction }}
        >
          {label}
        </Line>
        {detail === undefined ? null : (
          <Line role="caption" tone="dim">
            {detail}
          </Line>
        )}
      </View>
      {selected ? <Icon name="check" size={theme.space.sp8} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  text: { flexShrink: 1 },
});
