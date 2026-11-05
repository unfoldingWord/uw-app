import { StyleSheet, View } from 'react-native';
import { Loading } from '@shared/ui';

export type ReloadVeilProps = { loading: boolean; label: string };

export function ReloadVeil({ loading, label }: ReloadVeilProps) {
  return loading ? (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Loading label={label} />
    </View>
  ) : null;
}
