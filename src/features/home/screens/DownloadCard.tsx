import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import type { FailureCode } from '@lib/domain/failures';
import { GlassButton, Icon } from '@shared/glass';
import { useService } from '@shared/kernel';
import { useTheme } from '@shared/theme';
import { Card, Dot, Notice, ProgressBar, Tappable, ThemedText } from '@shared/ui';
import { createHomeService, type DownloadView } from '../service';

export type DownloadCardProps = {
  view: DownloadView;
  autonym: string;
  onOpenLanguages: () => void;
  onComplete: () => Promise<FailureCode | undefined>;
};

export function DownloadCard({ view, autonym, onOpenLanguages, onComplete }: DownloadCardProps) {
  const home = useService(createHomeService);
  const theme = useTheme();
  const words = home.words();
  const [failure, setFailure] = useState<FailureCode | undefined>(undefined);
  switch (view.state) {
    case 'no-language':
      return null;
    case 'installing':
      return (
        <Card compact shadow="rest" press={{ accessibilityLabel: view.label, onPress: onOpenLanguages }}>
          <View style={styles.line}>
            <View style={styles.grow}>
              <ThemedText variant="overline" tone="dim">
                {view.label}
              </ThemedText>
            </View>
            <ThemedText variant="caption" tone="title" weight={theme.fontWeight.fwMedium}>
              {words.t('home.download.percent', { percent: view.percent })}
            </ThemedText>
          </View>
          <ProgressBar percent={view.percent} accessibilityLabel={view.label} />
          <ThemedText variant="caption" tone="body">
            {view.detail}
          </ThemedText>
        </Card>
      );
    case 'none':
    case 'missing': {
      const action =
        view.state === 'none'
          ? words.t('state.notDownloaded.action', { language: autonym })
          : words.t('home.download.complete');
      const shown = view.failure ?? failure;
      return (
        <Card compact shadow="rest">
          <ThemedText variant="label" tone="title">
            {view.label}
          </ThemedText>
          {view.detail === undefined ? null : (
            <ThemedText variant="caption" tone="body">
              {view.detail}
            </ThemedText>
          )}
          {view.online ? null : <Notice text={words.t('home.download.waiting')} />}
          {shown === undefined ? null : <Notice text={words.t(`failure.${shown}`)} />}
          <GlassButton
            variant="dark"
            disabled={!view.online}
            onPress={async () => {
              setFailure(undefined);
              setFailure(await onComplete());
            }}
          >
            {action}
          </GlassButton>
        </Card>
      );
    }
    case 'complete':
      return (
        <Tappable
          accessibilityLabel={view.label}
          onPress={onOpenLanguages}
          radius={theme.radius.rPill}
          style={[
            styles.line,
            {
              gap: theme.space.sp5,
              paddingVertical: theme.space.sp7,
              paddingHorizontal: theme.space.gutterCard,
              backgroundColor: theme.color.glassFill1,
              borderWidth: theme.border.borderGlassSoft.width,
              borderColor: theme.border.borderGlassSoft.color,
            },
          ]}
        >
          {() => (
            <>
              <Dot tone="ready" />
              <View style={styles.grow}>
                <ThemedText variant="label" tone="title">
                  {view.label}
                </ThemedText>
              </View>
              <Icon name="chevronRight" size={theme.fontSize.fsBody} />
            </>
          )}
        </Tappable>
      );
  }
}

const styles = StyleSheet.create({
  line: { flexDirection: 'row', alignItems: 'center' },
  grow: { flex: 1, minWidth: 0 },
});
