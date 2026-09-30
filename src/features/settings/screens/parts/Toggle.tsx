import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { touchSlop } from '@shared/glass/pressGate';
import { useTheme } from '@shared/theme';

export type ToggleProps = {
  label: string;
  on: boolean;
  onChange: (on: boolean) => unknown;
  hint?: string;
  disabled?: boolean;
};

export function Toggle({ label, on, onChange, hint, disabled = false }: ToggleProps) {
  const theme = useTheme();
  const [busy, setBusy] = useState(false);
  const [focused, setFocused] = useState(false);
  const width = theme.space.sp14;
  const height = theme.space.sp11;
  const inset = theme.space.sp2;
  const knob = height - inset * 2;
  const change = async () => {
    if (busy || disabled) {
      return;
    }
    setBusy(true);
    try {
      await onChange(!on);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityHint={hint}
      accessibilityState={{ checked: on, busy, disabled }}
      disabled={disabled}
      {...touchSlop(height, width)}
      onPress={() => void change()}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
    >
      <View
        style={[
          styles.track,
          {
            width,
            height,
            borderRadius: theme.radius.rPill,
            backgroundColor: on ? theme.color.accentBlue : theme.color.dotRingStroke,
          },
          focused ? { boxShadow: theme.shadow.glowFocus.css } : null,
        ]}
      >
        <View
          style={{
            position: 'absolute',
            top: inset,
            start: on ? width - knob - inset : inset,
            width: knob,
            height: knob,
            borderRadius: theme.radius.rPill,
            backgroundColor: theme.color.paper000,
            boxShadow: theme.shadow.shadowRest.css,
          }}
        />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: { flexShrink: 0 },
});
