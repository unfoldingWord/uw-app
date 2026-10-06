import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { GlassButton, GlassSurface } from '@shared/glass';
import type { PackId } from '@lib/domain/pack';
import { useService } from '@shared/kernel';
import { useTheme } from '@shared/theme';
import { ProgressBar } from '@shared/ui';
import { createStudyService, skipMs, type AudioView, type PlayerStatus } from '../../service';
import type { StudyWords } from '../../strings';
import { failureText } from './failure';
import { Say } from './Say';

export type AudioBarProps = {
  words: StudyWords;
  reference: string;
  audio: AudioView;
  onDownload: (pack: PackId) => Promise<void>;
  failure: string | undefined;
};

const tickMs = 500;

type OnPhoneProps = { words: StudyWords; path: string; label: string; failure: string | undefined };

function measuredOf(status: PlayerStatus): { positionMs: number; durationMs: number } | undefined {
  return status.state === 'playing' || status.state === 'paused' || status.state === 'ended'
    ? { positionMs: status.positionMs, durationMs: status.durationMs }
    : undefined;
}

function OnPhone({ words, path, label, failure }: OnPhoneProps) {
  const theme = useTheme();
  const service = useService(createStudyService);
  const controls = useMemo(() => service.listen({ path }), [service, path]);
  const [status, setStatus] = useState<PlayerStatus>(() => controls.status());

  useEffect(() => {
    setStatus(controls.status());
    const unsubscribe = controls.subscribe(setStatus);
    return () => {
      unsubscribe();
      void controls.stop();
    };
  }, [controls]);

  const playing = status.state === 'playing';
  useEffect(() => {
    if (!playing) {
      return undefined;
    }
    const timer = setInterval(() => setStatus(controls.status()), tickMs);
    return () => clearInterval(timer);
  }, [controls, playing]);

  const measured = measuredOf(status);
  const time = service.audioTime(status);
  const caption =
    status.state === 'failed'
      ? failureText(words, status.code)
      : (failure ??
        (status.state === 'loading'
          ? words.t('study.audio.loading')
          : measured === undefined
            ? words.t('study.audio.onPhone')
            : time));
  const warm = status.state === 'failed' || failure !== undefined;
  const run = async (work: () => Promise<PlayerStatus>) => {
    setStatus(await work());
  };

  return (
    <View style={{ gap: theme.space.sp4 }}>
      <View style={[styles.row, { gap: theme.space.sp6 }]}>
        <GlassButton
          variant="dark"
          size="sm"
          busy={status.state === 'loading'}
          onPress={() => run(() => controls.toggle())}
        >
          {playing ? words.t('study.audio.pause') : words.t('study.audio.play')}
        </GlassButton>
        <View style={[styles.fill, { gap: theme.space.sp1 }]}>
          <Say role="caption" tone="title" weight="medium">
            {label}
          </Say>
          <Say role="caption" tone={warm ? 'warm' : 'dim'} live={warm}>
            {caption}
          </Say>
        </View>
      </View>
      {measured === undefined ? null : (
        <ProgressBar
          percent={measured.durationMs > 0 ? (measured.positionMs / measured.durationMs) * 100 : 0}
          accessibilityLabel={time}
        />
      )}
      <View style={[styles.row, styles.wrap, { gap: theme.space.sp3 }]}>
        <GlassButton
          variant="glass"
          size="sm"
          disabled={measured === undefined}
          onPress={() => run(() => controls.skip(-skipMs))}
        >
          {words.t('study.audio.back')}
        </GlassButton>
        <GlassButton
          variant="glass"
          size="sm"
          disabled={measured === undefined}
          onPress={() => run(() => controls.skip(skipMs))}
        >
          {words.t('study.audio.forward')}
        </GlassButton>
      </View>
    </View>
  );
}

export function AudioBar({ words, reference, audio, onDownload, failure }: AudioBarProps) {
  const theme = useTheme();
  if (audio.state === 'none') {
    return null;
  }
  const surface = {
    marginHorizontal: theme.space.sp5,
    marginTop: theme.space.sp3,
    paddingVertical: theme.space.sp5,
    paddingHorizontal: theme.space.sp6,
  };
  if (audio.state === 'on-phone') {
    return (
      <GlassSurface level={4} blur="heavy" radius="xl" shadow="rest" style={surface}>
        <OnPhone words={words} path={audio.clip.path} label={audio.label} failure={failure} />
      </GlassSurface>
    );
  }
  if (audio.state === 'no-chapter') {
    return (
      <GlassSurface
        level={4}
        blur="heavy"
        radius="xl"
        shadow="rest"
        style={[surface, { gap: theme.space.sp1 }]}
      >
        <Say role="caption" tone="title" weight="medium">
          {audio.label}
        </Say>
        <Say role="caption" tone="dim">
          {audio.detail}
        </Say>
      </GlassSurface>
    );
  }
  return (
    <GlassSurface
      level={4}
      blur="heavy"
      radius="xl"
      shadow="rest"
      style={[styles.row, surface, { gap: theme.space.sp6 }]}
    >
      <GlassButton
        variant="dark"
        size="sm"
        busy={audio.state === 'downloading'}
        disabled={audio.state === 'not-downloaded' && !audio.online}
        onPress={() => onDownload(audio.pack)}
      >
        {audio.label}
      </GlassButton>
      <View style={[styles.fill, { gap: theme.space.sp1 }]}>
        <Say role="caption" tone="title" weight="medium">
          {words.t('study.audio.label', { reference })}
        </Say>
        <Say role="caption" tone={failure === undefined ? 'dim' : 'warm'} live={failure !== undefined}>
          {failure ??
            (audio.state === 'not-downloaded'
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
  wrap: { flexWrap: 'wrap' },
  fill: { flex: 1 },
});
