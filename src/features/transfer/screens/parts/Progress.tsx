import { GlassButton } from '@shared/glass';
import { useTheme } from '@shared/theme';
import { Card, ProgressBar, ThemedText } from '@shared/ui';
import type { StatusView } from '../../service';

export type ProgressCardProps = {
  status: StatusView | undefined;
  waiting: string;
  stop: string;
  onStop: () => Promise<void>;
  code?: { label: string; hint: string };
};

export function ProgressCard({ status, waiting, stop, onStop, code }: ProgressCardProps) {
  const theme = useTheme();
  const label = status?.label ?? waiting;
  return (
    <Card>
      {code === undefined ? null : (
        <>
          <ThemedText variant="hero" tone="title" accessibilityRole="header" align="center">
            {code.label}
          </ThemedText>
          <ThemedText variant="caption" tone="body" align="center">
            {code.hint}
          </ThemedText>
        </>
      )}
      <ThemedText
        variant="label"
        tone="title"
        weight={theme.fontWeight.fwSemibold}
        accessibilityLiveRegion="polite"
      >
        {label}
      </ThemedText>
      <ProgressBar percent={status?.percent ?? 0} accessibilityLabel={label} />
      <GlassButton variant="quiet" onPress={onStop}>
        {stop}
      </GlassButton>
    </Card>
  );
}
