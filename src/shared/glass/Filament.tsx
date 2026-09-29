import type { StyleProp, ViewStyle } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { useTheme } from '@shared/theme';
import { filamentPath } from './geometry';
import { referenceValues } from './referenceValues';

export type FilamentProps = {
  height?: number;
  width?: number;
  branch?: boolean;
  color?: string;
  node?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function Filament({
  height = 70,
  width = 120,
  branch = false,
  color,
  node = true,
  style,
}: FilamentProps) {
  const theme = useTheme();
  const { strokeWidth, nodeRadius, straightWidth } = referenceValues.filament;
  const span = branch ? width : straightWidth;
  const stroke = color ?? theme.color.filamentStroke;
  return (
    <Svg
      width={span}
      height={height}
      viewBox={`0 0 ${span} ${height}`}
      style={[{ overflow: 'visible' }, style]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Path
        d={filamentPath(height, width, branch)}
        stroke={stroke}
        strokeWidth={strokeWidth}
        fill="none"
        strokeLinecap="round"
      />
      {node ? (
        <Circle
          cx={span / 2}
          cy={height}
          r={nodeRadius}
          fill={theme.color.surfaceSolid}
          stroke={stroke}
          strokeWidth={strokeWidth}
        />
      ) : null}
    </Svg>
  );
}
