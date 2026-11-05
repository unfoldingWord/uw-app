import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { failureCodeOf, type FailureCode } from '@lib/domain/failures';
import { GlassButton, GlassIconButton, Icon } from '@shared/glass';
import { useService } from '@shared/kernel';
import { FrameCard, FrameNavigation, type FrameStep } from '@shared/story';
import { useTheme } from '@shared/theme';
import { Card, Header, Loading, ScreenScaffold, Tappable, ThemedText } from '@shared/ui';
import {
  createFormationService,
  type Bookmark,
  type FormationService,
  type FoundationsSession,
  type Group,
  type Pictures,
  type SessionMovementId,
  type StoryAbsence,
  type StoryList as StoryListValue,
} from '../../service';
import { Blocks } from './Blocks';
import { FallbackCard } from './FallbackCard';
import { GroupNotes } from './GroupNotes';
import {
  atSession,
  doneMovements,
  placeGroup,
  sessionMovementIds,
  shownFormation,
  useFailure,
} from './groupWrites';
import { MovementsCard } from './MovementsCard';
import { PictureNotice } from './PictureNotice';
import { StoryList } from './StoryList';
import { TalkCard } from './TalkCard';
import { useLoad } from './useLoad';
import { useStoryAudio } from './useStoryAudio';
import { passageHref, sectionTitle, sessionHref, storyHref, storyShareHref } from './wording';

const frameDwellMs = 6000;

export type ReaderMode = 'read' | 'group';

type Reading = {
  readonly session: FoundationsSession | undefined;
  readonly list: StoryListValue;
  readonly group: Group | undefined;
  readonly alongside: boolean;
  readonly saved: Bookmark | undefined;
  readonly pictures: Pictures;
  readonly absence: StoryAbsence | undefined;
};

async function loadReading(service: FormationService, mode: ReaderMode, number: number): Promise<Reading> {
  const [session, list] = await Promise.all([
    mode === 'read'
      ? service.read(number)
      : service
          .session('foundations', number)
          .then((found) => (found?.track === 'foundations' ? found : undefined)),
    service.storyList(number),
  ]);
  return {
    session,
    list,
    group: mode === 'group' ? service.active() : undefined,
    alongside: service.englishAlongside(),
    saved: service.saved(number),
    pictures: service.pictures(),
    absence: session === undefined ? await service.absence(number) : undefined,
  };
}

export type StoryReaderProps = { mode: ReaderMode; number: number; frame?: number };

export function StoryReader({ mode, number, frame }: StoryReaderProps) {
  const service = useService(createFormationService);
  const router = useRouter();
  const words = service.words();
  const load = useCallback(() => loadReading(service, mode, number), [service, mode, number]);
  const loaded = useLoad(load);
  const value = loaded.value;
  const back = {
    label: words.t('common.back'),
    onPress: () => (router.canGoBack() ? router.back() : router.navigate('/formation')),
  };
  const language = service.language();
  const languageName = language === undefined ? '' : service.languageName(language);

  if (value?.session === undefined) {
    return (
      <ScreenScaffold dense header={<Header title={words.t('formation.title')} back={back} />}>
        {loaded.loading ? (
          <Loading label={words.t('common.busy')} />
        ) : (
          <Card level={1}>
            <ThemedText variant="body" tone="title">
              {value?.absence === 'not-found'
                ? words.t('session.story.notFound', { number, language: languageName })
                : words.t('state.notDownloaded', { language: languageName })}
            </ThemedText>
            {value?.absence === 'not-found' ? (
              <GlassButton variant="dark" onPress={() => router.navigate('/formation')}>
                {words.t('session.story.list')}
              </GlassButton>
            ) : (
              <GlassButton variant="dark" onPress={() => router.push('/languages')}>
                {words.t('state.notDownloaded.action', { language: languageName })}
              </GlassButton>
            )}
          </Card>
        )}
        {loaded.failure === undefined ? null : (
          <ThemedText variant="caption" tone="body">
            {words.t(`failure.${loaded.failure}`)}
          </ThemedText>
        )}
      </ScreenScaffold>
    );
  }

  const session = value.session;
  const anchor = session.play.frames.findIndex((item) => item.number === frame);
  return (
    <Reader
      key={`${mode}:${session.number}`}
      mode={mode}
      service={service}
      session={session}
      reading={value}
      initialFrame={Math.max(0, anchor)}
      languageName={languageName}
      back={back}
      onChanged={loaded.reload}
      onStory={(story) =>
        router.replace(mode === 'read' ? storyHref(story) : sessionHref('foundations', story))
      }
      onGroups={() => router.push('/formation/groups')}
      onShare={() => router.push(storyShareHref(session.number))}
      onPassage={(reference) => router.navigate(passageHref(reference))}
    />
  );
}

type ReaderProps = {
  mode: ReaderMode;
  service: FormationService;
  session: FoundationsSession;
  reading: Reading;
  initialFrame: number;
  languageName: string;
  back: { label: string; onPress: () => void };
  onChanged: () => Promise<void>;
  onStory: (story: number) => void;
  onGroups: () => void;
  onShare: () => void;
  onPassage: (reference: string) => void;
};

function Reader({
  mode,
  service,
  session,
  reading,
  initialFrame,
  languageName,
  back,
  onChanged,
  onStory,
  onGroups,
  onShare,
  onPassage,
}: ReaderProps) {
  const theme = useTheme();
  const words = service.words();
  const { group, list, alongside, saved, pictures } = reading;
  const story = session.story;
  const frames = session.play.frames;
  const total = list.stories.length;
  const [frame, setFrame] = useState(Math.min(initialFrame, Math.max(0, frames.length - 1)));
  const [playing, setPlaying] = useState(false);
  const [listOpen, setListOpen] = useState(false);
  const [failure, run] = useFailure();
  const [bookmarkFailure, setBookmarkFailure] = useState<FailureCode | undefined>(undefined);
  const [englishFailure, setEnglishFailure] = useState<FailureCode | undefined>(undefined);
  const here = atSession(group, 'foundations', session.number);
  const [moveOffered, setMoveOffered] = useState(mode === 'group' && group !== undefined && !here);
  const [selected, setSelected] = useState<SessionMovementId>(
    here ? (group?.position.movement ?? 'observation') : 'observation',
  );
  const timer = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const audio = useStoryAudio(service, session.play.audio);
  const audioPlaying = audio.status.state === 'playing';
  const grouped = mode === 'group';
  const formation = grouped ? shownFormation(session) : undefined;
  const done = doneMovements(group, session.number);
  const finished = group !== undefined && done.size === sessionMovementIds.length;
  const current = frames[frame];
  const talk = service.talk(story, current?.number ?? 0);
  const questionsShown = grouped && session.outline.includes('study-questions');

  useEffect(() => {
    if (!playing) {
      return undefined;
    }
    timer.current = setInterval(() => {
      setFrame((at) => {
        if (at >= frames.length - 1) {
          setPlaying(false);
          return at;
        }
        return at + 1;
      });
    }, frameDwellMs);
    return () => clearInterval(timer.current);
  }, [playing, frames.length]);

  const play = async () => {
    if (playing) {
      setPlaying(false);
      if (audioPlaying) {
        await audio.toggle();
      }
      return;
    }
    setPlaying(true);
    if (!audioPlaying) {
      await audio.toggle();
    }
    const passed =
      group !== undefined &&
      group.position.track === 'foundations' &&
      group.position.session > session.number;
    if (grouped && group !== undefined && !passed) {
      const started = await run(() =>
        service.start(group.id, { track: 'foundations', session: session.number }),
      );
      if (!here && started?.ok === true) {
        setMoveOffered(true);
      }
      await onChanged();
    }
  };

  const moveGroup = async () => {
    if (group === undefined) {
      return;
    }
    await run(() => placeGroup(service, group, 'foundations', session.number));
    setMoveOffered(false);
    await onChanged();
  };

  const complete = async () => {
    if (group === undefined) {
      return;
    }
    await run(async () => {
      const placed = await placeGroup(service, group, 'foundations', session.number, selected);
      return placed?.ok === true ? service.complete(group.id) : placed;
    });
    const next = sessionMovementIds[sessionMovementIds.indexOf(selected) + 1];
    if (next !== undefined) {
      setSelected(next);
    }
    await onChanged();
  };

  const toggleBookmark = async () => {
    const outcome = saved === undefined ? await service.save(session.number) : await service.unsave(saved.id);
    setBookmarkFailure(outcome === undefined ? 'unexpected' : outcome.ok ? undefined : outcome.code);
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

  const atFirst = frame === 0;
  const atLast = frame >= frames.length - 1;
  const previous: FrameStep =
    atFirst && list.previous !== undefined
      ? { label: words.t('session.story.previous'), story: true, onPress: () => onStory(list.previous ?? 0) }
      : {
          label: words.t('session.frame.previous'),
          disabled: atFirst,
          onPress: () => setFrame((at) => Math.max(0, at - 1)),
        };
  const next: FrameStep =
    atLast && list.next !== undefined
      ? { label: words.t('session.story.next'), story: true, onPress: () => onStory(list.next ?? 0) }
      : {
          label: words.t('session.frame.next'),
          disabled: atLast,
          onPress: () => setFrame((at) => Math.min(frames.length - 1, at + 1)),
        };

  const openingSections = [formation?.keyIdea, formation?.creedalVerse, formation?.summary]
    .filter((section) => section !== undefined)
    .filter((section) => session.outline.includes(section.id));
  const position = words.t('session.overline', { number: session.number, total });
  const subtitle =
    group === undefined
      ? languageName
      : words.t('session.meta', { group: group.name, language: languageName });
  const [firstReference] = story.references;
  const playLabel = playing
    ? words.t('session.pause')
    : grouped
      ? words.t('session.play')
      : words.t('session.read.play');

  const footer = (
    <FrameNavigation
      previous={previous}
      next={next}
      below={
        <>
          {audio.controls === undefined || audio.status.state === 'idle' ? null : (
            <ThemedText
              variant="caption"
              tone={audio.status.state === 'failed' ? 'body' : 'dim'}
              live={audio.status.state === 'failed'}
              style={styles.footerLine}
            >
              {audio.status.state === 'failed'
                ? words.t(`failure.${audio.status.code}`)
                : service.audioTime(audio.status)}
            </ThemedText>
          )}
          {moveOffered && group !== undefined && !here ? (
            <View style={[styles.footerRow, { gap: theme.space.sp4 }]}>
              <ThemedText variant="caption" tone="title" live style={styles.grow}>
                {words.t('session.move.ask', { group: group.name })}
              </ThemedText>
              <GlassButton size="sm" variant="dark" onPress={moveGroup}>
                {words.t('session.move.confirm')}
              </GlassButton>
              <GlassButton size="sm" onPress={() => setMoveOffered(false)}>
                {words.t('session.move.later')}
              </GlassButton>
            </View>
          ) : null}
        </>
      }
    >
      <GlassButton variant="dark" size="lg" full onPress={play}>
        {playLabel}
      </GlassButton>
    </FrameNavigation>
  );

  const header = (
    <Header
      back={back}
      centred
      trailing={
        <>
          <GlassIconButton
            label={words.t(saved === undefined ? 'common.bookmark.add' : 'common.bookmark.remove')}
            onPress={toggleBookmark}
          >
            <Icon name="bookmark" color={saved === undefined ? undefined : theme.color.accentBlue} />
          </GlassIconButton>
          <GlassIconButton label={words.t('common.share')} onPress={onShare}>
            <Icon name="navigation" />
          </GlassIconButton>
        </>
      }
    >
      <Tappable
        accessibilityLabel={position}
        accessibilityHint={words.t('session.story.list')}
        selected={listOpen}
        radius={theme.radius.rPill}
        onPress={() => setListOpen((open) => !open)}
        style={[styles.title, { paddingHorizontal: theme.space.sp4, paddingVertical: theme.space.sp2 }]}
      >
        {() => (
          <>
            <View style={[styles.titleRow, { gap: theme.space.sp2 }]}>
              <ThemedText variant="body" tone="title" weight={theme.fontWeight.fwSemibold} align="center">
                {position}
              </ThemedText>
              <Icon name="chevronDown" size={theme.space.sp8} />
            </View>
            <ThemedText variant="caption" tone="dim" align="center">
              {subtitle}
            </ThemedText>
          </>
        )}
      </Tappable>
    </Header>
  );

  return (
    <ScreenScaffold dense header={header} dock={footer}>
      {listOpen ? (
        <StoryList
          words={words}
          stories={list.stories}
          current={session.number}
          onChoose={(chosen) => {
            setListOpen(false);
            if (chosen !== session.number) {
              onStory(chosen);
            }
          }}
        />
      ) : null}
      {bookmarkFailure === undefined ? null : (
        <ThemedText variant="caption" tone="body" live>
          {words.t(`failure.${bookmarkFailure}`)}
        </ThemedText>
      )}
      {grouped && session.movements.state === 'not-in-language' ? (
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
              <ThemedText variant="overline" tone="dim" accessibilityRole="header">
                {sectionTitle(words, section.id)}
              </ThemedText>
              <Blocks
                blocks={section.blocks}
                tone={section.id === 'key-idea' ? 'title' : 'body'}
                language={formation?.language ?? service.language()}
              />
            </View>
          ))}
        </Card>
      )}
      {current === undefined ? null : (
        <FrameCard
          title={story.title}
          position={words.t('session.frame', { number: frame + 1, total: frames.length })}
          text={current.text}
          language={story.language}
          direction={story.direction}
          pictureLabel={words.t('session.frame.picture', { number: current.number })}
          picture={service.picture(current)}
          count={frames.length}
          index={frame}
          inWell={
            <PictureNotice service={service} frame={current} pictures={pictures} onInstalled={onChanged} />
          }
        />
      )}
      {questionsShown ? (
        <TalkCard
          live
          title={words.t('session.talk.frame', { number: current?.number ?? frame + 1 })}
          questions={talk.frame}
        />
      ) : null}
      {questionsShown ? (
        <TalkCard title={words.t('session.talk.studyQuestions')} questions={talk.story} />
      ) : null}
      {formation === undefined || formation.movements.length === 0 ? null : (
        <MovementsCard
          words={words}
          source={service.languageName(formation.language)}
          language={formation.language}
          movements={formation.movements}
          selected={selected}
          done={done}
          onSelect={setSelected}
          {...(group === undefined ? {} : { onComplete: complete })}
        />
      )}
      {(formation?.closing ?? []).map((section) => (
        <Card key={section.id} level={1}>
          <ThemedText variant="overline" tone="dim" accessibilityRole="header">
            {sectionTitle(words, section.id)}
          </ThemedText>
          <Blocks blocks={section.blocks} language={formation?.language ?? service.language()} />
        </Card>
      ))}
      {failure === undefined ? null : (
        <ThemedText variant="caption" tone="body" live>
          {words.t(`failure.${failure}`)}
        </ThemedText>
      )}
      {grouped && finished ? (
        <Card level={1}>
          <ThemedText variant="label" tone="title" weight={theme.fontWeight.fwSemibold} live>
            {words.t('session.completed')}
          </ThemedText>
          {list.next === undefined ? null : (
            <GlassButton
              variant="dark"
              onPress={() => (list.next === undefined ? undefined : onStory(list.next))}
            >
              {words.t('session.nextSession')}
            </GlassButton>
          )}
        </Card>
      ) : null}
      {grouped ? (
        <GroupNotes
          service={service}
          group={group}
          track="foundations"
          number={session.number}
          onGroups={onGroups}
        />
      ) : null}
      {firstReference === undefined ? null : (
        <GlassButton variant="quiet" size="sm" onPress={() => onPassage(firstReference)}>
          {story.bibleReference.length === 0 ? firstReference : story.bibleReference}
        </GlassButton>
      )}
      <ThemedText variant="caption" tone="faint">
        {words.t('common.attribution', {
          resource: story.provenance.title,
          publisher: story.provenance.publisher,
          version: story.provenance.tag,
          licence: story.provenance.licence,
        })}
      </ThemedText>
    </ScreenScaffold>
  );
}

const styles = StyleSheet.create({
  footerLine: { width: '100%', textAlign: 'center' },
  footerRow: { width: '100%', flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' },
  grow: { flex: 1 },
  title: { alignItems: 'center' },
  titleRow: { flexDirection: 'row', alignItems: 'center' },
});
