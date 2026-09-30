import { View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useTheme } from '@shared/theme';
import { Card, ThemedText } from '@shared/ui';
import type { AddressFallback } from '../../service';

export function AddressCard({ fallback }: { fallback: AddressFallback }) {
  const theme = useTheme();
  const size = fallback.qr.length;
  return (
    <Card>
      <ThemedText variant="caption" tone="body">
        {fallback.network}
      </ThemedText>
      <View
        accessible
        accessibilityRole="image"
        accessibilityLabel={fallback.qrLabel}
        style={{
          alignSelf: 'center',
          width: '100%',
          aspectRatio: 1,
          padding: theme.space.sp4,
          borderRadius: theme.radius.rMd,
          backgroundColor: theme.color.paper000,
        }}
      >
        <Svg width="100%" height="100%" viewBox={`0 0 ${size} ${size}`}>
          <Path d={fallback.qrPath} fill={theme.color.ink900} />
        </Svg>
      </View>
      <ThemedText variant="body" tone="title" selectable>
        {fallback.label}
      </ThemedText>
    </Card>
  );
}
