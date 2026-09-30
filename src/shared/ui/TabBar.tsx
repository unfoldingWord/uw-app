import { Animated, Pressable, StyleSheet, View } from 'react-native';
import { GlassSurface, Icon, type IconName } from '@shared/glass';
import { usePress } from '@shared/glass/usePress';
import { useTheme } from '@shared/theme';
import { prototypeValues } from './prototypeValues';
import { useBottomInset } from './ScreenScaffold';
import { reportTabBarHeight, restingTabBarHeight, useTabBarGrowth } from './tabBarHeight';
import { ThemedText } from './ThemedText';

const minimumTabLabelScale = 0.6;

export type TabItem = {
  key: string;
  label: string;
  icon: IconName;
  focused: boolean;
  onPress: () => void;
};

function Tab({ label, icon, focused, onPress }: Omit<TabItem, 'key'>) {
  const theme = useTheme();
  const press = usePress(onPress, false);
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityLabel={label}
      accessibilityState={{ selected: focused }}
      style={styles.tab}
      {...press.handlers}
    >
      <Animated.View
        style={[
          styles.inner,
          {
            minHeight: prototypeValues.tabBar.item,
            paddingVertical: theme.space.sp2,
            gap: theme.space.sp2,
            borderRadius: theme.radius.rPill,
            backgroundColor: focused ? theme.color.glassFill4 : undefined,
            boxShadow: [
              focused ? theme.shadow.shadowRest.css : undefined,
              focused ? theme.shadow.innerTop.css : undefined,
              press.focused ? theme.shadow.glowFocus.css : undefined,
            ]
              .filter(Boolean)
              .join(', '),
            transform: press.transform,
          },
        ]}
      >
        <Icon name={icon} color={theme.color.textTitle} />
        <ThemedText
          variant="caption"
          tone="title"
          weight={theme.fontWeight.fwMedium}
          align="center"
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={minimumTabLabelScale}
        >
          {label}
        </ThemedText>
      </Animated.View>
    </Pressable>
  );
}

export type TabBarProps = { items: readonly TabItem[] };

export function useTabBarClearance(): number {
  const theme = useTheme();
  const growth = useTabBarGrowth(theme);
  return useBottomInset() + restingTabBarHeight(theme) + growth + theme.space.gapStack;
}

export function TabBar({ items }: TabBarProps) {
  const theme = useTheme();
  const bottom = useBottomInset();
  return (
    <View
      pointerEvents="box-none"
      style={[styles.dock, { start: theme.space.gutterScreen, end: theme.space.gutterScreen, bottom }]}
    >
      <GlassSurface
        level={3}
        blur="strong"
        radius="pill"
        shadow="float"
        accessibilityRole="tablist"
        style={[styles.row, { padding: theme.space.sp3 }]}
        onLayout={(event) => reportTabBarHeight(event.nativeEvent.layout.height)}
      >
        {items.map(({ key, ...item }) => (
          <Tab key={key} {...item} />
        ))}
      </GlassSurface>
    </View>
  );
}

const styles = StyleSheet.create({
  dock: { position: 'absolute' },
  row: { flexDirection: 'row' },
  tab: { flex: 1 },
  inner: { alignItems: 'center', justifyContent: 'center' },
});
