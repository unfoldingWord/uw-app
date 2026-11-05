import { StyleSheet, View } from 'react-native';
import { GlassButton } from '@shared/glass';
import { useTheme } from '@shared/theme';
import { Notice, ProgressBar, ThemedText } from '@shared/ui';
import type { FullTextLanguage } from '../../service';
import type { SettingsWords } from '../../strings';

export type FullTextLanguagesProps = {
  languages: readonly FullTextLanguage[];
  words: SettingsWords;
  onRetry: (language: string) => Promise<unknown>;
};

function stateLabel(item: FullTextLanguage, words: SettingsWords): string {
  switch (item.state.state) {
    case 'off':
      return words.t('common.off');
    case 'waiting':
      return words.t('settings.fullText.waiting');
    case 'building':
      return words.t('settings.fullText.building');
    case 'built':
      return words.t('settings.fullText.ready');
    case 'failed':
      return words.t('settings.fullText.failed');
  }
}

export function FullTextLanguages({ languages, words, onRetry }: FullTextLanguagesProps) {
  const theme = useTheme();
  return (
    <View style={{ gap: theme.space.sp5, paddingTop: theme.space.sp4 }}>
      {languages.map((item) => {
        const label = stateLabel(item, words);
        const { state } = item;
        return (
          <View key={item.language} style={{ gap: theme.space.sp3 }}>
            <View style={[styles.row, { gap: theme.space.sp6 }]}>
              <ThemedText variant="caption" tone="title" style={styles.grow}>
                {item.name}
              </ThemedText>
              <ThemedText variant="caption" tone="dim" live>
                {label}
              </ThemedText>
            </View>
            {state.state === 'building' || state.state === 'waiting' ? (
              <ProgressBar
                percent={state.state === 'building' ? state.percent : 0}
                accessibilityLabel={`${item.name}, ${label}`}
              />
            ) : null}
            {state.state === 'failed' ? (
              <Notice
                text={words.t(`failure.${state.code}`)}
                action={
                  <GlassButton
                    size="sm"
                    variant="dark"
                    accessibilityLabel={`${words.t('common.retry')}, ${item.name}`}
                    onPress={() => onRetry(item.language)}
                  >
                    {words.t('common.retry')}
                  </GlassButton>
                }
              />
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  grow: { flex: 1, minWidth: 0 },
});
