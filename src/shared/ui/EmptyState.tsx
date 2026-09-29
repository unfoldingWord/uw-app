import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { Icon, type IconName } from '@shared/glass';
import { useTheme } from '@shared/theme';
import { Card } from './Card';
import { prototypeValues } from './prototypeValues';
import { ThemedText } from './ThemedText';

export type EmptyStateProps = {
  title: string;
  body?: string;
  icon?: IconName;
  action?: ReactNode;
};

export function EmptyState({ title, body, icon, action }: EmptyStateProps) {
  const theme = useTheme();
  return (
    <Card compact shadow="rest">
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
              },
            ]}
          >
            <Icon name={icon} size={prototypeValues.row.iconSize} />
          </View>
        )}
        <View style={[styles.text, { gap: theme.space.sp2 }]}>
          <ThemedText variant="label" tone="title" weight={theme.fontWeight.fwSemibold}>
            {title}
          </ThemedText>
          {body === undefined ? null : (
            <ThemedText variant="caption" tone="body">
              {body}
            </ThemedText>
          )}
        </View>
      </View>
      {action}
    </Card>
  );
}

const styles = StyleSheet.create({
  line: { flexDirection: 'row', alignItems: 'center' },
  tile: { alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  text: { flex: 1, minWidth: 0 },
});
