import { Image } from 'react-native';
import logoColor from '@design-system/assets/logo/logo-horizontal-color.png';
import logoReversed from '@design-system/assets/logo/logo-horizontal-reversed.png';
import { GlassSurface } from '@shared/glass';
import { useTheme } from '@shared/theme';
import { prototypeValues } from './prototypeValues';

export type LogoProps = { label: string; height?: number };

export function Logo({ label, height = prototypeValues.logo.height }: LogoProps) {
  const theme = useTheme();
  return (
    <GlassSurface
      level={2}
      blur="medium"
      radius="pill"
      shadow="rest"
      style={{
        alignSelf: 'flex-start',
        paddingVertical: theme.space.sp6,
        paddingHorizontal: theme.space.gutterCard,
      }}
    >
      <Image
        source={theme.scheme === 'dark' ? logoReversed : logoColor}
        accessibilityRole="image"
        accessibilityLabel={label}
        resizeMode="contain"
        style={{ height, width: height * prototypeValues.logo.aspect }}
      />
    </GlassSurface>
  );
}
