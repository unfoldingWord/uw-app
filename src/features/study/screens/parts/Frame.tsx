import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { AuroraField, GlassIconButton, Icon, StatusBar } from '@shared/glass';
import { useTheme } from '@shared/theme';
import { Say } from './Say';

export function ScreenFrame({ children }: { children?: ReactNode }) {
  return (
    <AuroraField style={styles.fill}>
      <StatusBar />
      <View style={styles.fill}>{children}</View>
    </AuroraField>
  );
}

export type TopBarProps = {
  backLabel: string;
  overline?: string;
  title?: string;
  centered?: boolean;
  trailing?: ReactNode;
  children?: ReactNode;
};

export function TopBar({ backLabel, overline, title, centered = false, trailing, children }: TopBarProps) {
  const theme = useTheme();
  const router = useRouter();
  return (
    <View
      style={[
        styles.row,
        {
          gap: theme.space.sp5,
          paddingHorizontal: theme.space.gutterScreen,
          paddingTop: theme.space.sp6,
        },
      ]}
    >
      <GlassIconButton
        label={backLabel}
        size={theme.space.sp14}
        onPress={() => (router.canGoBack() ? router.back() : router.navigate('/study'))}
      >
        <Icon name="chevronLeft" />
      </GlassIconButton>
      <View style={[styles.fill, centered ? styles.centered : undefined]}>
        {children ?? (
          <>
            {overline === undefined || overline.length === 0 ? null : (
              <Say role="caption" tone="dim">
                {overline}
              </Say>
            )}
            {title === undefined ? null : (
              <Say role={centered ? 'label' : 'hero'} tone="title" weight={centered ? 'semibold' : undefined}>
                {title}
              </Say>
            )}
          </>
        )}
      </View>
      {trailing}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center' },
  centered: { alignItems: 'center' },
});
