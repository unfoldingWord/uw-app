import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Icon, type IconName } from '@shared/glass';
import { useTheme } from '@shared/theme';
import { Say } from './Say';

export type ResultRowProps = {
  icon: IconName;
  title: string;
  detail: string;
  onPress: () => void;
  quiet?: boolean;
};

export function ResultRow({ icon, title, detail, onPress, quiet = false }: ResultRowProps) {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);
  const [pressed, setPressed] = useState(false);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint={detail}
      onPress={onPress}
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
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  tile: { alignItems: 'center', justifyContent: 'center' },
  fill: { flex: 1, minWidth: 0 },
});
