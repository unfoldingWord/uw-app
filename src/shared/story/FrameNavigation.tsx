import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { GlassButton, GlassIconButton, Icon } from '@shared/glass';
import type { PressHandler } from '@shared/glass/usePress';
import { useTheme } from '@shared/theme';

export type FrameStep = {
  label: string;
  onPress: PressHandler;
  disabled?: boolean;
  story?: boolean;
};

export type FrameNavigationProps = {
  previous: FrameStep;
  next: FrameStep;
  children: ReactNode;
  below?: ReactNode;
};

function Step({ step, direction }: { step: FrameStep; direction: 'previous' | 'next' }) {
  const theme = useTheme();
  const icon = (
    <Icon name={direction === 'previous' ? 'chevronLeft' : 'chevronRight'} size={theme.space.sp8} />
  );
  if (step.story === true) {
    return (
      <GlassButton
        size="sm"
        disabled={step.disabled}
        onPress={step.onPress}
        {...(direction === 'previous' ? { leading: icon } : { trailing: icon })}
      >
        {step.label}
      </GlassButton>
    );
  }
  return (
    <GlassIconButton label={step.label} disabled={step.disabled} onPress={step.onPress}>
      <Icon name={direction === 'previous' ? 'chevronLeft' : 'chevronRight'} />
    </GlassIconButton>
  );
}

export function FrameNavigation({ previous, next, children, below }: FrameNavigationProps) {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.footer,
        {
          gap: theme.space.sp6,
          paddingHorizontal: theme.space.sp7,
          paddingTop: theme.space.sp6,
          paddingBottom: theme.space.sp6,
          borderTopStartRadius: theme.radius.rXl,
          borderTopEndRadius: theme.radius.rXl,
          backgroundColor: theme.color.glassFill4,
          borderTopWidth: theme.border.borderHairline.width,
          borderTopColor: theme.border.borderHairline.color,
        },
      ]}
    >
      <Step step={previous} direction="previous" />
      <View style={styles.grow}>{children}</View>
      <Step step={next} direction="next" />
      {below}
    </View>
  );
}

const styles = StyleSheet.create({
  footer: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' },
  grow: { flexGrow: 1, flexShrink: 1, flexBasis: 0, minWidth: '45%' },
});
