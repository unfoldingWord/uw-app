import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { Icon, type IconName } from '@shared/glass';
import { useTheme } from '@shared/theme';
import { prototypeValues } from './prototypeValues';
import { Tappable, type TapTarget } from './Tappable';
import { ThemedText } from './ThemedText';

export type RowProps = {
  title: string;
  detail?: string;
  icon?: IconName;
  trailing?: ReactNode;
  chevron?: boolean;
  selected?: boolean;
  press?: TapTarget;
  below?: ReactNode;
};

function RowBody({ title, detail, icon, trailing, chevron, selected, below }: Omit<RowProps, 'press'>) {
  const theme = useTheme();
  const soft = theme.border.borderGlassSoft;
  return (
    <View
      style={[
        {
          gap: theme.space.sp4,
          paddingVertical: theme.space.sp6,
          paddingStart: icon === undefined ? theme.space.sp8 : theme.space.sp6,
          paddingEnd: theme.space.sp7,
          borderRadius: theme.radius.rMd,
          borderWidth: soft.width,
          borderColor: soft.color,
          backgroundColor: selected === true ? theme.color.glassFill3 : theme.color.glassFill1,
          boxShadow: selected === true ? theme.shadow.innerTop.css : undefined,
        },
      ]}
    >
      <View style={[styles.line, { gap: theme.space.sp6 }]}>
        {icon === undefined ? null : (
          <View
            style={[
              styles.tile,
              {
                width: prototypeValues.row.iconTile,
                height: prototypeValues.row.iconTile,
                borderRadius: theme.radius.rSm,
                backgroundColor: theme.color.glassFill3,
                borderWidth: soft.width,
                borderColor: soft.color,
              },
            ]}
          >
            <Icon name={icon} size={prototypeValues.row.iconSize} />
          </View>
        )}
        <View style={styles.text}>
          <ThemedText variant="label" tone="title" weight={theme.fontWeight.fwSemibold}>
            {title}
          </ThemedText>
          {detail === undefined ? null : (
            <ThemedText variant="caption" tone="body">
              {detail}
            </ThemedText>
          )}
        </View>
        {trailing}
        {chevron === true ? <Icon name="chevronRight" size={prototypeValues.row.chevron} /> : null}
      </View>
      {below}
    </View>
  );
}

export function Row({ press, ...body }: RowProps) {
  const theme = useTheme();
  if (press === undefined) {
    return <RowBody {...body} />;
  }
  return (
    <Tappable {...press} selected={press.selected ?? body.selected} radius={theme.radius.rMd}>
      {() => <RowBody {...body} />}
    </Tappable>
  );
}

const styles = StyleSheet.create({
  line: { flexDirection: 'row', alignItems: 'center' },
  tile: { alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  text: { flex: 1, minWidth: 0 },
});
