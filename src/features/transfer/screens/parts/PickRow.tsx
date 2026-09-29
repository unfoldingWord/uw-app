import { View } from 'react-native';
import { Icon } from '@shared/glass';
import { useTheme } from '@shared/theme';
import { Row } from '@shared/ui';

function Check({ on }: { on: boolean }) {
  const theme = useTheme();
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        width: theme.space.sp10,
        height: theme.space.sp10,
        borderRadius: theme.radius.rPill,
        borderWidth: theme.border.borderGlass.width * 3,
        borderColor: on ? theme.color.accentBlue : theme.color.dotRingStroke,
        backgroundColor: on ? theme.color.accentBlue : undefined,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {on ? <Icon name="check" size={theme.space.sp7} color={theme.color.paper000} /> : null}
    </View>
  );
}

export type PickRowProps = {
  title: string;
  detail: string;
  label: string;
  on: boolean;
  onToggle: () => void;
};

export function PickRow({ title, detail, label, on, onToggle }: PickRowProps) {
  return (
    <Row
      title={title}
      detail={detail}
      selected={on}
      trailing={<Check on={on} />}
      press={{ onPress: onToggle, accessibilityLabel: label, selected: on }}
    />
  );
}
