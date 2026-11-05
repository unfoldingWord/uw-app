import { StyleSheet, View } from 'react-native';
import { GlassButton } from '@shared/glass';
import { useTheme } from '@shared/theme';
import { Notice, ProgressBar, Toggle } from '@shared/ui';
import type { FullTextIndexView } from '../../service';
import type { StudyWords } from '../../strings';
import { Say } from './Say';

export type FullTextRowProps = {
  index: FullTextIndexView | undefined;
  words: StudyWords;
  onToggle: (on: boolean) => Promise<void>;
  onRetry: () => Promise<void>;
};

function detailOf(index: FullTextIndexView | undefined, words: StudyWords): string {
  switch (index?.state.state) {
    case undefined:
      return words.t('common.busy');
    case 'off':
      return index.detail;
    case 'waiting':
    case 'building':
      return words.t('search.fullText.building');
    case 'built':
      return words.t('search.fullText.on');
    case 'failed':
      return words.t('search.fullText.failed');
  }
}

export function FullTextRow({ index, words, onToggle, onRetry }: FullTextRowProps) {
  const theme = useTheme();
  const title = words.t('search.fullText.title');
  const detail = detailOf(index, words);
  const state = index?.state;
  return (
    <View
      style={{
        gap: theme.space.sp5,
        paddingVertical: theme.space.sp6,
        paddingHorizontal: theme.space.sp7,
        borderRadius: theme.radius.rLg,
        backgroundColor: theme.color.glassFill2,
        borderWidth: theme.border.borderGlass.width,
        borderColor: theme.border.borderGlass.color,
      }}
    >
      <View style={[styles.row, { gap: theme.space.sp6 }]}>
        <View style={[styles.fill, { gap: theme.space.sp1 }]}>
          <Say role="label" tone="title" weight="semibold">
            {title}
          </Say>
          <Say role="caption" tone="body" live>
            {detail}
          </Say>
        </View>
        <Toggle
          label={title}
          hint={detail}
          on={index?.wanted ?? false}
          disabled={index === undefined}
          onChange={onToggle}
        />
      </View>
      {state?.state === 'building' || state?.state === 'waiting' ? (
        <ProgressBar
          percent={state.state === 'building' ? state.percent : 0}
          accessibilityLabel={words.t('search.fullText.building')}
        />
      ) : null}
      {state?.state === 'failed' ? (
        <Notice
          text={words.t(`failure.${state.code}`)}
          action={
            <GlassButton size="sm" variant="dark" onPress={onRetry}>
              {words.t('common.retry')}
            </GlassButton>
          }
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  fill: { flex: 1, minWidth: 0 },
});
