import type { LucideIcon } from 'lucide-react-native';
import ArrowBigUp from 'lucide-react-native/icons/arrow-big-up';
import ArrowUpRight from 'lucide-react-native/icons/arrow-up-right';
import Bell from 'lucide-react-native/icons/bell';
import Bookmark from 'lucide-react-native/icons/bookmark';
import Check from 'lucide-react-native/icons/check';
import ChevronDown from 'lucide-react-native/icons/chevron-down';
import ChevronLeft from 'lucide-react-native/icons/chevron-left';
import ChevronRight from 'lucide-react-native/icons/chevron-right';
import Clock from 'lucide-react-native/icons/clock';
import Compass from 'lucide-react-native/icons/compass';
import Delete from 'lucide-react-native/icons/delete';
import Ellipsis from 'lucide-react-native/icons/ellipsis';
import Folder from 'lucide-react-native/icons/folder';
import Funnel from 'lucide-react-native/icons/funnel';
import Globe from 'lucide-react-native/icons/globe';
import Layers from 'lucide-react-native/icons/layers';
import LayoutGrid from 'lucide-react-native/icons/layout-grid';
import Maximize2 from 'lucide-react-native/icons/maximize-2';
import Mic from 'lucide-react-native/icons/mic';
import Minimize from 'lucide-react-native/icons/minimize';
import Moon from 'lucide-react-native/icons/moon';
import Navigation from 'lucide-react-native/icons/navigation';
import Plus from 'lucide-react-native/icons/plus';
import Search from 'lucide-react-native/icons/search';
import Settings from 'lucide-react-native/icons/settings';
import Sparkle from 'lucide-react-native/icons/sparkle';
import Sun from 'lucide-react-native/icons/sun';
import Users from 'lucide-react-native/icons/users';
import type { StyleProp, ViewStyle } from 'react-native';
import { useTheme } from '@shared/theme';
import { useContentColor } from './context';
import { rightToLeftLayout } from './layoutDirection';
import { referenceValues } from './referenceValues';

const glyphs = {
  mic: Mic,
  navigation: Navigation,
  plus: Plus,
  chevronLeft: ChevronLeft,
  chevronRight: ChevronRight,
  arrowUpRight: ArrowUpRight,
  bookmark: Bookmark,
  maximize: Maximize2,
  minimize: Minimize,
  moon: Moon,
  sun: Sun,
  delete: Delete,
  shift: ArrowBigUp,
  search: Search,
  compass: Compass,
  sparkle: Sparkle,
  check: Check,
  chevronDown: ChevronDown,
  filter: Funnel,
  settings: Settings,
  users: Users,
  folder: Folder,
  ellipsis: Ellipsis,
  bell: Bell,
  grid: LayoutGrid,
  clock: Clock,
  globe: Globe,
  layers: Layers,
} as const satisfies Record<string, LucideIcon>;

export type IconName = keyof typeof glyphs;

export const iconNames = Object.keys(glyphs) as IconName[];

const directional: readonly IconName[] = [
  'chevronLeft',
  'chevronRight',
  'arrowUpRight',
  'navigation',
  'delete',
];

export type IconProps = {
  name: IconName;
  size?: number;
  stroke?: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
};

export function Icon({
  name,
  size = referenceValues.icon.size,
  stroke = referenceValues.icon.stroke,
  color,
  style,
}: IconProps) {
  const theme = useTheme();
  const contentColor = useContentColor();
  const Glyph = glyphs[name];
  const mirrored = rightToLeftLayout() && directional.includes(name);
  return (
    <Glyph
      size={size}
      color={color ?? contentColor ?? theme.color.textBody}
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[{ flexShrink: 0 }, mirrored ? { transform: [{ scaleX: -1 }] } : undefined, style]}
    />
  );
}
