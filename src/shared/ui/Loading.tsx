import { StyleSheet, View } from 'react-native';
import { DotRing } from '@shared/glass';

export type LoadingProps = { label: string };

export function Loading({ label }: LoadingProps) {
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityState={{ busy: true }}
      accessibilityLiveRegion="polite"
      style={styles.centre}
    >
      <DotRing />
    </View>
  );
}

const styles = StyleSheet.create({
  centre: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
