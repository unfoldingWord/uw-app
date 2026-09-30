import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AuroraField, StatusBar } from '@shared/glass';
import { referenceValues } from '@shared/glass/referenceValues';
import { useTheme } from '@shared/theme';
import { prototypeValues } from './prototypeValues';
import { useTabBarGrowth } from './tabBarHeight';

export type ScreenClearance = 'tabs' | 'footer' | 'none';

export type ScreenScaffoldProps = {
  header?: ReactNode;
  footer?: ReactNode;
  dock?: ReactNode;
  scroll?: boolean;
  dense?: boolean;
  clearance?: ScreenClearance;
  children?: ReactNode;
};

export function useBottomInset(): number {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  return Math.max(insets.bottom, theme.space.safeBottom);
}

export function ScreenScaffold({
  header,
  footer,
  dock,
  scroll = true,
  dense = false,
  clearance = 'none',
  children,
}: ScreenScaffoldProps) {
  const theme = useTheme();
  const bottom = useBottomInset();
  const growth = useTabBarGrowth(theme);
  const reserved =
    clearance === 'tabs'
      ? prototypeValues.tabBar.clearance + growth
      : clearance === 'footer'
        ? prototypeValues.tabBar.clearance - theme.space.sp10
        : theme.space.sp10;
  const content = {
    flexGrow: 1,
    paddingHorizontal: theme.space.gutterScreen,
    paddingBottom: dock === undefined ? bottom + reserved : theme.space.sp8,
    gap: theme.space.gapStack,
  };
  return (
    <AuroraField intensity={dense ? referenceValues.auroraField.denseIntensity : undefined}>
      <StatusBar />
      {header}
      {scroll ? (
        <ScrollView
          style={styles.fill}
          contentContainerStyle={content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.fill, content]}>{children}</View>
      )}
      {dock === undefined ? null : (
        <View style={{ paddingHorizontal: theme.space.sp5, paddingBottom: bottom }}>{dock}</View>
      )}
      {footer === undefined ? null : (
        <View
          style={[styles.footer, { start: theme.space.gutterScreen, end: theme.space.gutterScreen, bottom }]}
        >
          {footer}
        </View>
      )}
    </AuroraField>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  footer: { position: 'absolute' },
});
