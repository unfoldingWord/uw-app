import { useState } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '@shared/theme';
import { Say } from './Say';

export type Choice<K extends string> = {
  readonly key: K;
  readonly label: string;
  readonly selected: boolean;
};

export type ChoicesProps<K extends string> = {
  label?: string;
  choices: readonly Choice<K>[];
  onChoose: (key: K) => void;
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
};

function ChoicePill<K extends string>({
  choice,
  onChoose,
  compact,
}: {
  choice: Choice<K>;
  onChoose: (key: K) => void;
  compact: boolean;
}) {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);
  const [pressed, setPressed] = useState(false);
  const shadows = [
    choice.selected ? theme.shadow.shadowRest.css : undefined,
    choice.selected ? theme.shadow.innerTop.css : undefined,
    focused ? theme.shadow.glowFocus.css : undefined,
  ].filter((shadow): shadow is string => shadow !== undefined);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={choice.label}
      accessibilityState={{ selected: choice.selected }}
      onPress={() => onChoose(choice.key)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      style={[
        styles.pill,
        compact ? undefined : styles.grow,
        {
          paddingVertical: compact ? theme.space.sp3 : theme.space.sp4,
          paddingHorizontal: theme.space.sp6,
          borderRadius: theme.radius.rPill,
          borderWidth: theme.border.borderHairline.width,
          borderColor: compact ? theme.border.borderHairline.color : 'transparent',
          backgroundColor: choice.selected ? theme.color.glassFill4 : 'transparent',
          boxShadow: shadows.length === 0 ? undefined : shadows.join(', '),
          transform: [{ scale: pressed ? theme.motion.pressScale : 1 }],
        },
      ]}
    >
      <Say role={compact ? 'caption' : 'label'} tone="title" weight="medium">
        {choice.label}
      </Say>
    </Pressable>
  );
}

export function Choices<K extends string>({
  label,
  choices,
  onChoose,
  compact = false,
  style,
}: ChoicesProps<K>) {
  const theme = useTheme();
  return (
    <View
      accessibilityLabel={label}
      accessibilityRole="radiogroup"
      style={[
        styles.row,
        compact
          ? { gap: theme.space.sp3 }
          : {
              padding: theme.space.sp2,
              borderRadius: theme.radius.rPill,
              backgroundColor: theme.color.glassFill1,
              borderWidth: theme.border.borderGlassSoft.width,
              borderColor: theme.border.borderGlassSoft.color,
            },
        style,
      ]}
    >
      {choices.map((choice) => (
        <ChoicePill key={choice.key} choice={choice} onChoose={onChoose} compact={compact} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' },
  pill: { alignItems: 'center', justifyContent: 'center' },
  grow: { flexGrow: 1, flexBasis: 0 },
});
