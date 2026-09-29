import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { GlassButton, GlassSurface, type GlassButtonProps } from '@shared/glass';
import { useTheme } from '@shared/theme';
import { Say } from './Say';

export type StatePanelProps = {
  message: string;
  detail?: string;
  action?: { label: string; onPress: GlassButtonProps['onPress'] };
  failure?: string;
  children?: ReactNode;
};

export function StatePanel({ message, detail, action, failure, children }: StatePanelProps) {
  const theme = useTheme();
  return (
    <View style={[styles.bottom, { padding: theme.space.gutterScreen }]}>
      <GlassSurface
        level={2}
        radius="xl"
        style={{ padding: theme.space.gutterCard, gap: theme.space.gapStack }}
      >
        <Say role="body" tone="title" weight="medium">
          {message}
        </Say>
        {detail === undefined ? null : (
          <Say role="caption" tone="body">
            {detail}
          </Say>
        )}
        {children}
        {action === undefined ? null : (
          <GlassButton variant="dark" full onPress={action.onPress}>
            {action.label}
          </GlassButton>
        )}
        {failure === undefined ? null : (
          <Say role="caption" tone="warm" live>
            {failure}
          </Say>
        )}
      </GlassSurface>
    </View>
  );
}

const styles = StyleSheet.create({
  bottom: { flex: 1, justifyContent: 'flex-end' },
});
