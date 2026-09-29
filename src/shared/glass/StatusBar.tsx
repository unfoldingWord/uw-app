import { StatusBar as SystemStatusBar, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@shared/theme';

export type StatusBarProps = {
  tone?: 'light' | 'night';
  style?: StyleProp<ViewStyle>;
};

export function StatusBar({ tone = 'light', style }: StatusBarProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const lightContent = tone === 'night' || theme.scheme === 'dark';
  return (
    <View style={[{ height: insets.top }, style]}>
      <SystemStatusBar
        barStyle={lightContent ? 'light-content' : 'dark-content'}
        translucent
        backgroundColor="transparent"
      />
    </View>
  );
}
