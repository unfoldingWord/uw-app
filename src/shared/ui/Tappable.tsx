import type { ReactNode } from 'react';
import { Animated, Pressable, type StyleProp, type ViewStyle } from 'react-native';
import { usePress, type PressHandler } from '@shared/glass/usePress';
import { useTheme } from '@shared/theme';

export type TapTarget = {
  onPress: PressHandler;
  accessibilityLabel: string;
  accessibilityHint?: string;
  selected?: boolean;
  disabled?: boolean;
  testID?: string;
};

export type TappableProps = TapTarget & {
  radius: number;
  style?: StyleProp<ViewStyle>;
  children: (state: { busy: boolean }) => ReactNode;
};

export function Tappable({
  onPress,
  accessibilityLabel,
  accessibilityHint,
  selected,
  disabled = false,
  testID,
  radius,
  style,
  children,
}: TappableProps) {
  const theme = useTheme();
  const press = usePress(onPress, disabled, 'recoil');
  const inert = disabled || press.pending;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: inert, busy: press.pending, selected }}
      disabled={inert}
      testID={testID}
      {...press.handlers}
    >
      <Animated.View
        style={[
          style,
          {
            borderRadius: radius,
            transform: press.transform,
            boxShadow: press.focused ? theme.shadow.glowFocus.css : undefined,
          },
        ]}
      >
        {children({ busy: press.pending })}
      </Animated.View>
    </Pressable>
  );
}
