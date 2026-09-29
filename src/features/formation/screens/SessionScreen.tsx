import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { sessionMovements } from '@lib/domain/events';
import { failureCodeOf, type FailureCode } from '@lib/domain/failures';
import { GlassButton, GlassIconButton, Icon } from '@shared/glass';
import { useService } from '@shared/kernel';
import { useTheme } from '@shared/theme';
import {
  createFormationService,
  type FormationContent,
  type FormationService,
  type FoundationsSession,
  type Group,
  type PlayerStatus,
  type Session,
  type SessionMovementId,
  type Track,
  type TrainingSession,
} from '../service';
import { Blocks } from './parts/Blocks';
import { Card } from './parts/Card';
import { FallbackCard } from './parts/FallbackCard';
import { FrameCard } from './parts/FrameCard';
import { Line } from './parts/Line';
import { MovementsCard } from './parts/MovementsCard';
import { NotesCard } from './parts/NotesCard';
import { Screen } from './parts/Screen';
import { useLoad } from './parts/useLoad';
import { sectionTitle, sessionHref, storyShareHref } from './parts/wording';

const frameDwellMs = 6000;

const audioTickMs = 500;

const sessionMovementIds: readonly SessionMovementId[] = sessionMovements;

type Loaded = {
  readonly session: Session | undefined;
  readonly total: number;
  readonly group: Group | undefined;
  readonly alongside: boolean;
};

function trackOf(value: string | string[] | undefined): Track | undefined {
  return value === 'foundations' || value === 'training' || value === 'topics' ? value : undefined;
}

function numberOf(value: string | string[] | undefined): number | undefined {
  const parsed = typeof value === 'string' ? Number(value) : Number.NaN;
  return Number.isSafeInteger(parsed) && parsed >= 1 ? parsed : undefined;
}

async function loadSession(service: FormationService, track: Track, number: number): Promise<Loaded> {
  const [session, tracks] = await Promise.all([service.session(track, number), service.tracks()]);
  return {
    session,
    total: tracks.find((summary) => summary.track === track)?.sessions ?? 0,
    group: service.active(),
    alongside: service.englishAlongside(),
  };
}

function shownFormation(session: FoundationsSession): FormationContent | undefined {
  if (session.movements.state === 'in-language') {
    return session.movements.formation;
  }
  return session.movements.english.state === 'shown' ? session.movements.english.formation : undefined;
}

function atSession(group: Group | undefined, track: Track, number: number): boolean {
  return group !== undefined && group.position.track === track && group.position.session === number;
}

function doneMovements(group: Group | undefined, number: number): ReadonlySet<SessionMovementId> {
  if (group === undefined || group.position.track !== 'foundations') {
    return new Set();
  }
  if (group.position.session > number) {
    return new Set(sessionMovementIds);
  }
  if (group.position.session < number) {
    return new Set();
  }
  const reached = sessionMovementIds.indexOf(group.position.movement ?? 'observation');
  return new Set(sessionMovementIds.slice(0, reached));
}

export default function SessionScreen() {
  const service = useService(createFormationService);
  const router = useRouter();
  const words = service.words();
  const params = useLocalSearchParams<{ track: string; number: string }>();
  const track = trackOf(params.track);
  const number = numberOf(params.number);
  const load = useCallback(
    () =>
      track === undefined || number === undefined
        ? Promise.resolve<Loaded>({ session: undefined, total: 0, group: undefined, alongside: false })
        : loadSession(service, track, number),
    [service, track, number],
  );
  const loaded = useLoad(load);
  const value = loaded.value;
  const back = { label: words.t('common.back'), onPress: () => router.back() };
  const language = service.language();
  const languageName = language === undefined ? '' : service.languageName(language);

  if (value?.session === undefined || track === undefined || number === undefined) {
    return (
      <Screen title={words.t('formation.title')} back={back}>
        {loaded.loading ? (
          <Line role="body" tone="dim" live>
            {words.t('common.busy')}
          </Line>
        ) : (
          <Card level={1}>
            <Line role="body" tone="title">
              {words.t('state.notDownloaded', { language: languageName })}
            </Line>
            <GlassButton variant="dark" onPress={() => router.push('/languages')}>
              {words.t('state.notDownloaded.action', { language: languageName })}
            </GlassButton>
          </Card>
        )}
        {loaded.failure === undefined ? null : (
          <Line role="caption" tone="body">
            {words.t(`failure.${loaded.failure}`)}
          </Line>
        )}
      </Screen>
    );
  }

  const session = value.session;
  return session.track === 'foundations' ? (
    <Foundations
      service={service}
      session={session}
      total={value.total}
      group={value.group}
      alongside={value.alongside}
      languageName={languageName}
      onBack={back}
      onChanged={loaded.reload}
      onNext={() => router.replace(sessionHref(track, number + 1))}
      onGroups={() => router.push('/formation/groups')}
      onShare={() => router.push(storyShareHref(session.story.number))}
    />
  ) : (
    <Training
      service={service}
      session={session}
      total={value.total}
      group={value.group}
      languageName={languageName}
      onBack={back}
      onChanged={loaded.reload}
      onNext={() => router.replace(sessionHref(track, number + 1))}
      onGroups={() => router.push('/formation/groups')}
    />
  );
}

type SharedProps = {
  service: FormationService;
  total: number;
  group: Group | undefined;
  languageName: string;
  onBack: { label: string; onPress: () => void };
  onChanged: () => Promise<void>;
  onNext: () => void;
  onGroups: () => void;
};

async function placeGroup(
  service: FormationService,
  group: Group,
  track: Track,
  number: number,
  movement?: SessionMovementId,
): Promise<Group | undefined> {
  const here =
    atSession(group, track, number) && (movement === undefined || group.position.movement === movement);
  return here
    ? group
    : service.advance(group.id, { track, session: number, ...(movement === undefined ? {} : { movement }) });
}

function useFailure(): [FailureCode | undefined, (work: () => Promise<unknown>) => Promise<void>] {
  const [failure, setFailure] = useState<FailureCode | undefined>(undefined);
  const run = useCallback(async (work: () => Promise<unknown>) => {
    try {
      const result = await work();
      setFailure(result === undefined ? 'unexpected' : undefined);
    } catch (error) {
      setFailure(failureCodeOf(error));
    }
  }, []);
  return [failure, run];
}

function Foundations({
  service,
  session,
  total,
  group,
  alongside,
  languageName,
  onBack,
  onChanged,
  onNext,
  onGroups,
  onShare,
}: SharedProps & { session: FoundationsSession; alongside: boolean; onShare: () => void }) {
  const theme = useTheme();
  const words = service.words();
  const frames = session.play.frames;
  const [frame, setFrame] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [failure, run] = useFailure();
  const [englishFailure, setEnglishFailure] = useState<FailureCode | undefined>(undefined);
  const here = atSession(group, 'foundations', session.number);
  const [selected, setSelected] = useState<SessionMovementId>(
    here ? (group?.position.movement ?? 'observation') : 'observation',
  );
  const timer = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const formation = shownFormation(session);
  const done = doneMovements(group, session.number);
  const finished = group !== undefined && done.size === sessionMovementIds.length;
  const audio = session.play.audio;
  const latestAudio = useRef(audio);
  latestAudio.current = audio;
  const audioPath = audio.state === 'available' ? audio.clip.path : undefined;
  const storyAudio = useMemo(
    () => (audioPath === undefined ? undefined : service.listen(latestAudio.current)),
    [service, audioPath],
  );
  const [audioStatus, setAudioStatus] = useState<PlayerStatus>({ state: 'idle' });
  const audioPlaying = audioStatus.state === 'playing';

  useEffect(() => {
    if (storyAudio === undefined) {
      return undefined;
    }
    setAudioStatus(storyAudio.status());
    const unsubscribe = storyAudio.subscribe(setAudioStatus);
    return () => {
      unsubscribe();
      void storyAudio.stop();
    };
  }, [storyAudio]);

  useEffect(() => {
    if (storyAudio === undefined || !audioPlaying) {
      return undefined;
    }
    const tick = setInterval(() => setAudioStatus(storyAudio.status()), audioTickMs);
    return () => clearInterval(tick);
  }, [storyAudio, audioPlaying]);

  useEffect(() => {
    if (!playing) {
      return undefined;
    }
    timer.current = setInterval(() => {
      setFrame((current) => {
        if (current >= frames.length - 1) {
          setPlaying(false);
          return current;
        }
        return current + 1;
      });
    }, frameDwellMs);
    return () => clearInterval(timer.current);
  }, [playing, frames.length]);

  const play = async () => {
    if (playing) {
      setPlaying(false);
      if (storyAudio !== undefined && audioPlaying) {
        setAudioStatus(await storyAudio.toggle());
      }
      return;
    }
    setPlaying(true);
    if (storyAudio !== undefined && !audioPlaying) {
      setAudioStatus(await storyAudio.toggle());
    }
    const passed =
      group !== undefined &&
      group.position.track === 'foundations' &&
      group.position.session > session.number;
    if (group !== undefined && !passed) {
      await run(async () => {
        const placed = await placeGroup(service, group, 'foundations', session.number);
        return placed === undefined ? undefined : service.start(group.id);
      });
      await onChanged();
    }
  };

  const complete = async () => {
    if (group === undefined) {
      return;
    }
    await run(async () => {
      const placed = await placeGroup(service, group, 'foundations', session.number, selected);
      return placed === undefined ? undefined : service.complete(group.id);
    });
    const next = sessionMovementIds[sessionMovementIds.indexOf(selected) + 1];
    if (next !== undefined) {
      setSelected(next);
    }
    await onChanged();
  };

  const toggleEnglish = async (on: boolean) => {
    await service.setEnglishAlongside(on);
    await onChanged();
  };

  const downloadEnglish = async () => {
    if (
      session.movements.state !== 'not-in-language' ||
      session.movements.english.state !== 'needs-download'
    ) {
      return;
    }
    const pack = session.movements.english.pack;
    try {
      const outcome = await service.download(pack);
      setEnglishFailure(outcome.ok ? undefined : outcome.code);
    } catch (error) {
      setEnglishFailure(failureCodeOf(error));
    }
    await onChanged();
  };

  const openingSections = [formation?.keyIdea, formation?.creedalVerse, formation?.summary]
    .filter((section) => section !== undefined)
    .filter((section) => session.outline.includes(section.id));

  const footer = (
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
      <GlassIconButton
        label={words.t('session.frame.previous')}
        disabled={frame === 0}
        onPress={() => setFrame((current) => Math.max(0, current - 1))}
      >
        <Icon name="chevronLeft" />
      </GlassIconButton>
      <GlassButton variant="dark" size="lg" full style={styles.grow} onPress={play}>
        {playing ? words.t('session.pause') : words.t('session.play')}
      </GlassButton>
      <GlassIconButton
        label={words.t('session.frame.next')}
        disabled={frame >= frames.length - 1}
        onPress={() => setFrame((current) => Math.min(frames.length - 1, current + 1))}
      >
        <Icon name="chevronRight" />
      </GlassIconButton>
      {storyAudio === undefined || audioStatus.state === 'idle' ? null : (
        <Line
          role="caption"
          tone={audioStatus.state === 'failed' ? 'body' : 'dim'}
          live={audioStatus.state === 'failed'}
          style={styles.footerLine}
        >
          {audioStatus.state === 'failed'
            ? words.t(`failure.${audioStatus.code}`)
            : service.audioTime(audioStatus)}
        </Line>
      )}
    </View>
  );

  return (
    <Screen
      title={words.t('session.overline', { number: session.number, total })}
      subtitle={
        group === undefined
          ? languageName
          : words.t('session.meta', { group: group.name, language: languageName })
      }
      back={onBack}
      centred
      footer={footer}
      trailing={
        <GlassIconButton label={words.t('common.share')} onPress={onShare}>
          <Icon name="navigation" />
        </GlassIconButton>
      }
    >
      {session.movements.state === 'not-in-language' ? (
        <FallbackCard
          words={words}
          language={languageName}
          english={session.movements.english}
          englishName={service.languageName('en')}
          on={alongside}
          onToggle={toggleEnglish}
          onDownload={downloadEnglish}
          failure={englishFailure === undefined ? undefined : words.t(`failure.${englishFailure}`)}
        />
      ) : null}
      {openingSections.length === 0 ? null : (
        <Card level={1}>
          {openingSections.map((section) => (
            <View key={section.id} style={{ gap: theme.space.sp4 }}>
              <Line role="overline" tone="dim" accessibilityRole="header">
                {sectionTitle(words, section.id)}
              </Line>
              <Blocks blocks={section.blocks} tone={section.id === 'key-idea' ? 'title' : 'body'} />
            </View>
          ))}
        </Card>
      )}
      {frames.length === 0 ? null : (
        <FrameCard
          words={words}
          title={session.story.title}
          frames={frames}
          index={Math.min(frame, frames.length - 1)}
          pictureOf={service.picture}
        />
      )}
      {session.outline.includes('study-questions') && session.story.questions.length > 0 ? (
        <Card level={2}>
          <Line role="overline" tone="dim" accessibilityRole="header">
            {words.t('session.talk.studyQuestions')}
          </Line>
          {session.story.questions.map((question) => (
            <Line key={question.id} role="body" tone="body">
              {question.question}
            </Line>
          ))}
        </Card>
      ) : null}
      {formation === undefined || formation.movements.length === 0 ? null : (
        <MovementsCard
          words={words}
          source={service.languageName(formation.language)}
          movements={formation.movements}
          selected={selected}
          done={done}
          onSelect={setSelected}
          {...(group === undefined ? {} : { onComplete: complete })}
        />
      )}
      {(formation?.closing ?? []).map((section) => (
        <Card key={section.id} level={1}>
          <Line role="overline" tone="dim" accessibilityRole="header">
            {sectionTitle(words, section.id)}
          </Line>
          <Blocks blocks={section.blocks} />
        </Card>
      ))}
      {failure === undefined ? null : (
        <Line role="caption" tone="body" live>
          {words.t(`failure.${failure}`)}
        </Line>
      )}
      {finished ? (
        <Card level={1}>
          <Line role="label" tone="title" weight={theme.fontWeight.fwSemibold} live>
            {words.t('session.completed')}
          </Line>
          {session.number < total ? (
            <GlassButton variant="dark" onPress={onNext}>
              {words.t('session.nextSession')}
            </GlassButton>
          ) : null}
        </Card>
      ) : null}
      <GroupNotes
        service={service}
        group={group}
        track="foundations"
        number={session.number}
        onGroups={onGroups}
      />
    </Screen>
  );
}

function GroupNotes({
  service,
  group,
  track,
  number,
  onGroups,
}: {
  service: FormationService;
  group: Group | undefined;
  track: Track;
  number: number;
  onGroups: () => void;
}) {
  const words = service.words();
  if (group === undefined) {
    return (
      <Card level={1}>
        <Line role="body" tone="body">
          {words.t('session.chooseGroup')}
        </Line>
        <GlassButton onPress={onGroups}>{words.t('formation.groups.title')}</GlassButton>
      </Card>
    );
  }
  return <NotesCard service={service} words={words} group={group} track={track} session={number} />;
}

function Training({
  service,
  session,
  total,
  group,
  languageName,
  onBack,
  onChanged,
  onNext,
  onGroups,
}: SharedProps & { session: TrainingSession }) {
  const theme = useTheme();
  const words = service.words();
  const [failure, run] = useFailure();
  const finished =
    group !== undefined && group.position.track === 'training' && group.position.session > session.number;

  const complete = async () => {
    if (group === undefined) {
      return;
    }
    await run(async () => {
      const placed = await placeGroup(service, group, 'training', session.number);
      return placed === undefined ? undefined : service.complete(group.id);
    });
    await onChanged();
  };

  return (
    <Screen
      title={words.t('formation.training.lesson', { number: session.number, total })}
      subtitle={
        group === undefined
          ? languageName
          : words.t('session.meta', { group: group.name, language: languageName })
      }
      back={onBack}
      centred
    >
      <Card level={2}>
        <Line role="cardTitle" tone="title" accessibilityRole="header">
          {session.article.title}
        </Line>
        {session.article.subtitle === undefined ? null : (
          <Line role="label" tone="dim">
            {session.article.subtitle}
          </Line>
        )}
        <Blocks blocks={session.article.blocks} />
      </Card>
      {group === undefined ? null : finished ? (
        <Card level={1}>
          <Line role="label" tone="title" weight={theme.fontWeight.fwSemibold} live>
            {words.t('session.completed')}
          </Line>
          {session.number < total ? (
            <GlassButton variant="dark" onPress={onNext}>
              {words.t('session.nextSession')}
            </GlassButton>
          ) : null}
        </Card>
      ) : (
        <GlassButton
          full
          variant="dark"
          leading={<Icon name="check" size={theme.space.sp8} />}
          onPress={complete}
        >
          {words.t('session.complete')}
        </GlassButton>
      )}
      {failure === undefined ? null : (
        <Line role="caption" tone="body" live>
          {words.t(`failure.${failure}`)}
        </Line>
      )}
      <GroupNotes
        service={service}
        group={group}
        track="training"
        number={session.number}
        onGroups={onGroups}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  footer: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' },
  footerLine: { width: '100%', textAlign: 'center' },
  grow: { flex: 1 },
});
