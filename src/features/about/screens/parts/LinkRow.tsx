import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { GlassSurface, Icon } from '@shared/glass';
import { useTheme } from '@shared/theme';
import { ThemedText } from '@shared/ui';

export type LinkRowProps = {
  title: string;
  about?: string;
  hint: string;
  brand?: boolean;
  external?: boolean;
  onPress: () => void;
};

export function LinkRow({ title, about, hint, brand = false, external = true, onPress }: LinkRowProps) {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);
  return (
    <Pressable
      accessibilityRole={external ? 'link' : 'button'}
      accessibilityLabel={about === undefined ? title : `${title}, ${about}`}
      accessibilityHint={hint}
      onPress={onPress}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={({ pressed }) => ({ transform: [{ scale: pressed ? theme.motion.pressScale : 1 }] })}
    >
      <GlassSurface
        level={1}
        blur="soft"
        radius="md"
        shadow="none"
        style={[
          styles.row,
          { gap: theme.space.sp6, paddingVertical: theme.space.sp6, paddingHorizontal: theme.space.sp8 },
          focused ? { boxShadow: theme.shadow.glowFocus.css } : null,
        ]}
      >
        <View style={[styles.text, { gap: theme.space.sp1 }]}>
          <ThemedText
            variant="body"
            tone="title"
            family={brand ? 'brand' : 'core'}
            weight={theme.fontWeight.fwSemibold}
          >
            {title}
          </ThemedText>
          {about === undefined ? null : (
            <ThemedText variant="caption" tone="body" family={brand ? 'brand' : 'core'}>
              {about}
            </ThemedText>
          )}
        </View>
        <Icon name={external ? 'arrowUpRight' : 'chevronRight'} size={theme.space.sp8} />
      </GlassSurface>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  text: { flex: 1, minWidth: 0 },
});
