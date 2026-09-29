import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { GlassIconButton, Icon, type IconName } from '@shared/glass';
import type { PressHandler } from '@shared/glass/usePress';
import { useTheme } from '@shared/theme';
import { prototypeValues } from './prototypeValues';
import { ThemedText } from './ThemedText';

export type IconActionProps = {
  icon: IconName;
  label: string;
  onPress?: PressHandler;
  busy?: boolean;
  disabled?: boolean;
  accessibilityHint?: string;
  testID?: string;
};

export function IconAction({
  icon,
  label,
  onPress,
  busy,
  disabled,
  accessibilityHint,
  testID,
}: IconActionProps) {
  return (
    <GlassIconButton
      size={prototypeValues.control}
      label={label}
      onPress={onPress}
      busy={busy}
      disabled={disabled}
      accessibilityHint={accessibilityHint}
      testID={testID}
    >
      <Icon name={icon} />
    </GlassIconButton>
  );
}

export type HeaderProps = {
  overline?: string;
  title?: string;
  leading?: ReactNode;
  trailing?: ReactNode;
  back?: { label: string; onPress: PressHandler };
};

export function Header({ overline, title, leading, trailing, back }: HeaderProps) {
  const theme = useTheme();
  const hasTitle = overline !== undefined || title !== undefined;
  return (
    <View
      style={[
        styles.row,
        {
          gap: theme.space.sp5,
          paddingTop: prototypeValues.headerTop,
          paddingHorizontal: theme.space.gutterScreen,
          paddingBottom: theme.space.sp6,
        },
      ]}
    >
      {back === undefined ? null : (
        <IconAction icon="chevronLeft" label={back.label} onPress={back.onPress} />
      )}
      {leading}
      {hasTitle ? (
        <View style={styles.titles}>
          {overline === undefined ? null : (
            <ThemedText variant="caption" tone="dim">
              {overline}
            </ThemedText>
          )}
          {title === undefined ? null : (
            <ThemedText variant="hero" tone="title" accessibilityRole="header">
              {title}
            </ThemedText>
          )}
        </View>
      ) : (
        <View style={styles.titles} />
      )}
      {trailing === undefined ? null : (
        <View style={[styles.row, { gap: theme.space.gapInline }]}>{trailing}</View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  titles: { flex: 1, minWidth: 0 },
});
