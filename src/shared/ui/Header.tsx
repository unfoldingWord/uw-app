import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { GlassIconButton, Icon, type IconName } from '@shared/glass';
import type { PressHandler } from '@shared/glass/usePress';
import { useTheme } from '@shared/theme';
import { titleSize, titleStyle } from './headerTitle';
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
  subtitle?: string;
  leading?: ReactNode;
  trailing?: ReactNode;
  back?: { label: string; onPress: PressHandler };
  centred?: boolean;
  brand?: boolean;
  children?: ReactNode;
};

export function Header({
  overline,
  title,
  subtitle,
  leading,
  trailing,
  back,
  centred = false,
  brand = false,
  children,
}: HeaderProps) {
  const theme = useTheme();
  const size = titleSize(back !== undefined, centred);
  const family = brand ? 'brand' : 'core';
  const hasTitle = overline !== undefined || title !== undefined || subtitle !== undefined;
  return (
    <View
      style={[
        styles.row,
        back === undefined ? styles.bottomAligned : undefined,
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
      <View style={[styles.titles, centred ? styles.centred : undefined]}>
        {children ??
          (hasTitle ? (
            <>
              {overline === undefined ? null : (
                <ThemedText
                  variant={brand ? 'overline' : 'caption'}
                  tone={brand ? 'accent' : 'dim'}
                  family={family}
                  align={centred ? 'center' : 'auto'}
                >
                  {overline}
                </ThemedText>
              )}
              {title === undefined ? null : (
                <ThemedText
                  variant={size === 'detail' ? 'body' : 'hero'}
                  tone="title"
                  family={family}
                  weight={size === 'detail' && !brand ? theme.fontWeight.fwSemibold : undefined}
                  align={centred ? 'center' : 'auto'}
                  accessibilityRole="header"
                  style={titleStyle(theme, size, title)}
                >
                  {title}
                </ThemedText>
              )}
              {subtitle === undefined ? null : (
                <ThemedText variant="caption" tone="dim" family={family} align={centred ? 'center' : 'auto'}>
                  {subtitle}
                </ThemedText>
              )}
            </>
          ) : null)}
      </View>
      {trailing === undefined ? null : (
        <View style={[styles.row, { gap: theme.space.gapInline }]}>{trailing}</View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  bottomAligned: { alignItems: 'flex-end' },
  titles: { flex: 1, minWidth: 0 },
  centred: { alignItems: 'center' },
});
