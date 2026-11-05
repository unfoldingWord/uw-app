import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback } from 'react';
import { GlassButton, Icon } from '@shared/glass';
import { useService } from '@shared/kernel';
import { useTheme } from '@shared/theme';
import { Card, Loading, Screen, ThemedText } from '@shared/ui';
import {
  createFormationService,
  type FormationService,
  type Group,
  type Track,
  type TrainingSession,
} from '../service';
import { Blocks } from './parts/Blocks';
import { GroupNotes } from './parts/GroupNotes';
import { placeGroup, useFailure } from './parts/groupWrites';
import { StoryReader } from './parts/StoryReader';
import { useLoad } from './parts/useLoad';
import { sessionHref } from './parts/wording';

type Loaded = {
  readonly session: TrainingSession | undefined;
  readonly total: number;
  readonly group: Group | undefined;
};

function trackOf(value: string | string[] | undefined): Track | undefined {
  return value === 'foundations' || value === 'training' || value === 'topics' ? value : undefined;
}

function numberOf(value: string | string[] | undefined): number | undefined {
  const parsed = typeof value === 'string' ? Number(value) : Number.NaN;
  return Number.isSafeInteger(parsed) && parsed >= 1 ? parsed : undefined;
}

async function loadLesson(service: FormationService, track: Track, number: number): Promise<Loaded> {
  const [session, tracks] = await Promise.all([service.session(track, number), service.tracks()]);
  return {
    session: session?.track === 'training' ? session : undefined,
    total: tracks.find((summary) => summary.track === track)?.sessions ?? 0,
    group: service.active(),
  };
}

export default function SessionScreen() {
  const params = useLocalSearchParams<{ track: string; number: string }>();
  const track = trackOf(params.track);
  const number = numberOf(params.number);
  if (track === 'foundations' && number !== undefined) {
    return <StoryReader mode="group" number={number} />;
  }
  return <LessonScreen track={track} number={number} />;
}

function LessonScreen({ track, number }: { track: Track | undefined; number: number | undefined }) {
  const service = useService(createFormationService);
  const router = useRouter();
  const words = service.words();
  const load = useCallback(
    () =>
      track === undefined || number === undefined
        ? Promise.resolve<Loaded>({ session: undefined, total: 0, group: undefined })
        : loadLesson(service, track, number),
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
          <Loading label={words.t('common.busy')} />
        ) : (
          <Card level={1}>
            <ThemedText variant="body" tone="title">
              {words.t('state.notDownloaded', { language: languageName })}
            </ThemedText>
            <GlassButton variant="dark" onPress={() => router.push('/languages')}>
              {words.t('state.notDownloaded.action', { language: languageName })}
            </GlassButton>
          </Card>
        )}
        {loaded.failure === undefined ? null : (
          <ThemedText variant="caption" tone="body">
            {words.t(`failure.${loaded.failure}`)}
          </ThemedText>
        )}
      </Screen>
    );
  }

  return (
    <Training
      service={service}
      session={value.session}
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

type TrainingProps = {
  service: FormationService;
  session: TrainingSession;
  total: number;
  group: Group | undefined;
  languageName: string;
  onBack: { label: string; onPress: () => void };
  onChanged: () => Promise<void>;
  onNext: () => void;
  onGroups: () => void;
};

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
}: TrainingProps) {
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
      return placed?.ok === true ? service.complete(group.id) : placed;
    });
    await onChanged();
  };

  return (
    <Screen
      dense
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
        <ThemedText variant="cardTitle" tone="title" accessibilityRole="header">
          {session.article.title}
        </ThemedText>
        {session.article.subtitle === undefined ? null : (
          <ThemedText variant="label" tone="dim">
            {session.article.subtitle}
          </ThemedText>
        )}
        <Blocks blocks={session.article.blocks} language={service.language()} />
      </Card>
      {group === undefined ? null : finished ? (
        <Card level={1}>
          <ThemedText variant="label" tone="title" weight={theme.fontWeight.fwSemibold} live>
            {words.t('session.completed')}
          </ThemedText>
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
        <ThemedText variant="caption" tone="body" live>
          {words.t(`failure.${failure}`)}
        </ThemedText>
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
