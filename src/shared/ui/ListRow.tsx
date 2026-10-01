import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { GlassSurface, Icon } from '@shared/glass';
import type { PressHandler } from '@shared/glass/usePress';
import { useTheme } from '@shared/theme';
import { Tappable } from './Tappable';
import { ThemedText } from './ThemedText';

export type ListRowProps = {
  title: string;
  detail?: string;
  leading?: ReactNode;
  trailing?: ReactNode;
  below?: ReactNode;
  selected?: boolean;
  hint?: string;
  onPress?: PressHandler;
};

function ListRowBody({ title, detail, leading, trailing, below, onPress }: ListRowProps) {
  const theme = useTheme();
  return (
    <GlassSurface
      level={2}
      blur="strong"
      radius="lg"
      shadow="rest"
      style={[
        styles.row,
        { gap: theme.space.sp7, paddingVertical: theme.space.sp7, paddingHorizontal: theme.space.gutterCard },
      ]}
    >
      {leading}
      <View style={[styles.text, { gap: theme.space.sp1 }]}>
        <ThemedText variant="body" tone="title" weight={theme.fontWeight.fwSemibold}>
          {title}
        </ThemedText>
        {detail === undefined ? null : (
          <ThemedText variant="caption" tone="body">
            {detail}
          </ThemedText>
        )}
        {below}
      </View>
      {trailing ?? (onPress === undefined ? null : <Icon name="chevronRight" size={theme.space.sp8} />)}
    </GlassSurface>
  );
}

export function ListRow(props: ListRowProps) {
  const theme = useTheme();
  const { title, detail, selected, hint, onPress } = props;
  if (onPress === undefined) {
    return <ListRowBody {...props} />;
  }
  return (
    <Tappable
      onPress={onPress}
      accessibilityLabel={detail === undefined ? title : `${title}, ${detail}`}
      {...(hint === undefined ? {} : { accessibilityHint: hint })}
      selected={selected === true}
      radius={theme.radius.rLg}
    >
      {() => <ListRowBody {...props} />}
    </Tappable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  text: { flex: 1, minWidth: 0 },
});
