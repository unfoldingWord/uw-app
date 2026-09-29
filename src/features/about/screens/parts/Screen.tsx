import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AuroraField, GlassIconButton, Icon, StatusBar } from '@shared/glass';
import { useTheme } from '@shared/theme';
import { Line } from './Line';

export type ScreenProps = {
  title: string;
  overline?: string;
  subtitle?: string;
  back?: { label: string; onPress: () => void };
  trailing?: ReactNode;
  footer?: ReactNode;
  tabBar?: boolean;
  centred?: boolean;
  intensity?: number;
  brand?: boolean;
  children?: ReactNode;
};

export function Screen({
  title,
  overline,
  subtitle,
  back,
  trailing,
  footer,
  tabBar = false,
  centred = false,
  intensity,
  brand = false,
  children,
}: ScreenProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const gutter = theme.space.gutterScreen;
  const bottom = tabBar ? theme.space.sp15 + theme.space.sp14 + insets.bottom : theme.space.sp13;
  return (
    <AuroraField intensity={intensity}>
      <StatusBar />
      <View
        style={[
          styles.header,
          back === undefined ? styles.bottomAligned : undefined,
          { gap: theme.space.gapStack, paddingHorizontal: gutter, paddingTop: theme.space.sp6 },
        ]}
      >
        {back === undefined ? null : (
          <GlassIconButton label={back.label} onPress={back.onPress}>
            <Icon name="chevronLeft" />
          </GlassIconButton>
        )}
        <View style={[styles.heading, centred ? styles.centred : undefined]}>
          {overline === undefined ? null : (
            <Line role={brand ? 'overline' : 'caption'} tone={brand ? 'accent' : 'dim'} brand={brand}>
              {overline}
            </Line>
          )}
          <Line
            role={brand || back === undefined ? 'hero' : 'cardTitle'}
            tone="title"
            brand={brand}
            accessibilityRole="header"
          >
            {title}
          </Line>
          {subtitle === undefined ? null : (
            <Line role="caption" tone="dim" brand={brand}>
              {subtitle}
            </Line>
          )}
        </View>
        {trailing}
      </View>
      <ScrollView
        style={styles.scroll}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          gap: theme.space.gapStack,
          paddingHorizontal: gutter,
          paddingTop: theme.space.sp8,
          paddingBottom: footer === undefined ? bottom : theme.space.sp8,
        }}
      >
        {children}
      </ScrollView>
      {footer === undefined ? null : (
        <View style={{ paddingHorizontal: theme.space.sp5, paddingBottom: insets.bottom }}>{footer}</View>
      )}
    </AuroraField>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center' },
  bottomAligned: { alignItems: 'flex-end' },
  heading: { flex: 1, minWidth: 0 },
  centred: { alignItems: 'center' },
  scroll: { flex: 1 },
});
