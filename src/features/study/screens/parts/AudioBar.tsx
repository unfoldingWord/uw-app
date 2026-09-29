import { StyleSheet, View } from 'react-native';
import { GlassButton, GlassSurface } from '@shared/glass';
import type { PackId } from '@lib/domain/pack';
import { useTheme } from '@shared/theme';
import type { AudioView } from '../../service';
import type { StudyWords } from '../../strings';
import { Say } from './Say';

export type AudioBarProps = {
  words: StudyWords;
  reference: string;
  audio: AudioView;
  onDownload: (pack: PackId) => Promise<void>;
  failure: string | undefined;
};

export function AudioBar({ words, reference, audio, onDownload, failure }: AudioBarProps) {
  const theme = useTheme();
  if (audio.state === 'none') {
    return null;
  }
  return (
    <GlassSurface
      level={4}
      blur="heavy"
      radius="xl"
      shadow="rest"
      style={[
        styles.row,
        {
          marginHorizontal: theme.space.sp5,
          marginTop: theme.space.sp3,
          paddingVertical: theme.space.sp5,
          paddingHorizontal: theme.space.sp6,
          gap: theme.space.sp6,
        },
      ]}
    >
      {audio.state === 'on-phone' ? (
        <GlassButton
          variant="dark"
          size="sm"
          disabled
          accessibilityHint={words.t('failure.audio.unavailable')}
        >
          {words.t('study.audio.play')}
        </GlassButton>
      ) : (
        <GlassButton
          variant="dark"
          size="sm"
          busy={audio.state === 'downloading'}
          disabled={audio.state === 'not-downloaded' && !audio.online}
          onPress={() => onDownload(audio.pack)}
        >
          {audio.label}
        </GlassButton>
      )}
      <View style={[styles.fill, { gap: theme.space.sp1 }]}>
        <Say role="caption" tone="title" weight="medium">
          {audio.state === 'on-phone' ? audio.label : words.t('study.audio.label', { reference })}
        </Say>
        <Say role="caption" tone={failure === undefined ? 'dim' : 'warm'} live={failure !== undefined}>
          {failure ??
            (audio.state === 'on-phone'
              ? words.t('study.audio.onPhone')
              : audio.state === 'not-downloaded'
                ? audio.online
                  ? audio.detail
                  : words.t('state.offline')
                : audio.label)}
        </Say>
      </View>
    </GlassSurface>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  fill: { flex: 1 },
});
