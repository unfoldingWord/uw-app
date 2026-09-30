import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { AuroraField, StatusBar } from '@shared/glass';
import { referenceValues } from '@shared/glass/referenceValues';
import { Header, Loading } from '@shared/ui';

export type ScreenFrameProps = { dense?: boolean; loading?: string; children?: ReactNode };

export function ScreenFrame({ dense = false, loading, children }: ScreenFrameProps) {
  return (
    <AuroraField
      style={styles.fill}
      intensity={dense ? referenceValues.auroraField.denseIntensity : undefined}
    >
      <StatusBar />
      <View style={styles.fill}>{loading === undefined ? children : <Loading label={loading} />}</View>
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
  const router = useRouter();
  return (
    <Header
      back={{
        label: backLabel,
        onPress: () => (router.canGoBack() ? router.back() : router.navigate('/study')),
      }}
      overline={overline === undefined || overline.length === 0 ? undefined : overline}
      title={title}
      centred={centered}
      trailing={trailing}
    >
      {children}
    </Header>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
});
