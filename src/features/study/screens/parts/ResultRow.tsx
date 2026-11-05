import { useState } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import { Icon, type IconName } from '@shared/glass';
import { useKeyframeLoop } from '@shared/glass/motion';
import { createPressGate } from '@shared/glass/pressGate';
import { referenceValues } from '@shared/glass/referenceValues';
import { useTheme } from '@shared/theme';
import { Say } from './Say';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export type ResultRowProps = {
  icon: IconName;
  title: string;
  detail: string;
  onPress: () => void | Promise<void>;
  quiet?: boolean;
};

export function ResultRow({ icon, title, detail, onPress, quiet = false }: ResultRowProps) {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);
  const [pressed, setPressed] = useState(false);
  const [pending, setPending] = useState(false);
  const [gate] = useState(() => createPressGate(setPending));
  const pulse = useKeyframeLoop(
    theme.motion.keyframes.breathe,
    referenceValues.dotRing.breatheMs,
    theme.motion.easing.easeLiquid,
    pending && !theme.reducedMotion,
  );
  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint={detail}
      accessibilityState={{ busy: pending, disabled: pending }}
      disabled={pending}
      onPress={() => {
        gate.press(onPress);
      }}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      style={[
        styles.row,
        {
          gap: theme.space.sp6,
          paddingVertical: theme.space.sp6,
          paddingHorizontal: theme.space.sp7,
          borderRadius: quiet ? theme.radius.rLg : theme.radius.rMd,
          backgroundColor: quiet ? theme.color.glassFill2 : theme.color.glassFill1,
          borderWidth: (quiet ? theme.border.borderGlass : theme.border.borderGlassSoft).width,
          borderColor: (quiet ? theme.border.borderGlass : theme.border.borderGlassSoft).color,
          boxShadow: focused ? theme.shadow.glowFocus.css : undefined,
          transform: [{ scale: pressed ? theme.motion.pressScale : 1 }],
          opacity: pulse.value('opacity'),
        },
      ]}
    >
      {quiet ? null : (
        <View
          style={[
            styles.tile,
            {
              width: theme.space.sp13,
              height: theme.space.sp13,
              borderRadius: theme.radius.rSm,
              backgroundColor: theme.color.glassFill3,
              borderWidth: theme.border.borderGlassSoft.width,
              borderColor: theme.border.borderGlassSoft.color,
            },
          ]}
        >
          <Icon name={icon} />
        </View>
      )}
      <View style={[styles.fill, { gap: theme.space.sp1 }]}>
        <Say role="label" tone="title" weight="semibold">
          {title}
        </Say>
        <Say role="caption" tone="body">
          {detail}
        </Say>
      </View>
      {quiet ? <Icon name="chevronRight" /> : null}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  tile: { alignItems: 'center', justifyContent: 'center' },
  fill: { flex: 1, minWidth: 0 },
});
