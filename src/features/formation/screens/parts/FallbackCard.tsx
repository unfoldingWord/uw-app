import { StyleSheet, View } from 'react-native';
import { GlassButton, GlassChip } from '@shared/glass';
import { useTheme } from '@shared/theme';
import type { EnglishMovements, FormationWords } from '../../service';
import { Card } from './Card';
import { Line } from './Line';
import { Toggle } from './Toggle';

export type FallbackCardProps = {
  words: FormationWords;
  language: string;
  english: EnglishMovements;
  englishName: string;
  on: boolean;
  onToggle: (on: boolean) => Promise<unknown>;
  onDownload: () => Promise<unknown>;
  failure: string | undefined;
};

function lineFor(words: FormationWords, english: EnglishMovements, language: string): string {
  switch (english.state) {
    case 'off':
      return words.t('session.fallback.offer');
    case 'shown':
      return words.t('session.fallback.showing', { language });
    case 'needs-download':
      return words.t('session.fallback.needsEnglish');
    case 'not-in-english':
      return words.t('session.fallback.notYet');
  }
}

export function FallbackCard({
  words,
  language,
  english,
  englishName,
  on,
  onToggle,
  onDownload,
  failure,
}: FallbackCardProps) {
  const theme = useTheme();
  return (
    <Card level={1}>
      <View style={[styles.row, { gap: theme.space.sp6 }]}>
        <View
          style={{
            width: theme.space.sp4,
            height: theme.space.sp4,
            borderRadius: theme.radius.rPill,
            backgroundColor: theme.color.accentWarm,
          }}
        />
        <View style={[styles.grow, { gap: theme.space.sp1 }]}>
          <Line role="label" tone="title" weight={theme.fontWeight.fwSemibold}>
            {words.t('session.fallback.title', { language })}
          </Line>
          <Line role="caption" tone="body">
            {lineFor(words, english, language)}
          </Line>
        </View>
        <Toggle label={words.t('session.fallback.toggle')} on={on} onChange={onToggle} />
      </View>
      <GlassChip size="sm">{words.t('session.fallback.notYet')}</GlassChip>
      {english.state === 'needs-download' ? (
        <GlassButton variant="dark" onPress={onDownload}>
          {words.t('state.notDownloaded.action', { language: englishName })}
        </GlassButton>
      ) : null}
      {failure === undefined ? null : (
        <Line role="caption" tone="body">
          {failure}
        </Line>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  grow: { flex: 1, minWidth: 0 },
});
