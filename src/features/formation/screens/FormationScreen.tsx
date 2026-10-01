import { useRouter } from 'expo-router';
import { useCallback } from 'react';
import { View } from 'react-native';
import { GlassButton, GlassSurface, Icon } from '@shared/glass';
import { useService } from '@shared/kernel';
import { useTheme } from '@shared/theme';
import { Card, ListRow, Screen, SectionTitle, ThemedText } from '@shared/ui';
import {
  createFormationService,
  type FormationService,
  type FormationWords,
  type Group,
  type Progress as GroupProgress,
  type TrackSummary,
} from '../service';
import { PictureWell } from './parts/PictureWell';
import { Progress } from './parts/Progress';
import { useLoad } from './parts/useLoad';
import { groupLine, sessionHref } from './parts/wording';

type GroupState = { readonly group: Group; readonly progress: GroupProgress | undefined };

type Overview = {
  readonly language: string | undefined;
  readonly tracks: readonly TrackSummary[];
  readonly groups: readonly GroupState[];
  readonly active: Group | undefined;
};

async function overviewOf(service: FormationService): Promise<Overview> {
  const tracks = await service.tracks();
  const groups = await Promise.all(
    service.groups().map(async (group) => ({ group, progress: await service.progress(group.id) })),
  );
  return { language: service.language(), tracks, groups, active: service.active() };
}

function coverageOf(words: FormationWords, foundations: TrackSummary | undefined): string {
  if (foundations === undefined || foundations.track !== 'foundations') {
    return words.t('formation.coverage.stories');
  }
  return foundations.movements === 'in-language'
    ? words.t('formation.coverage.movements')
    : words.t('formation.coverage.stories');
}

export default function FormationScreen() {
  const service = useService(createFormationService);
  const router = useRouter();
  const theme = useTheme();
  const words = service.words();
  const load = useCallback(() => overviewOf(service), [service]);
  const overview = useLoad(load);
  const value = overview.value;
  const languageName = value?.language === undefined ? undefined : service.languageName(value.language);
  const foundations = value?.tracks.find((track) => track.track === 'foundations');
  const training = value?.tracks.find((track) => track.track === 'training');
  const topics = value?.tracks.find((track) => track.track === 'topics');
  const nothing =
    value !== undefined &&
    languageName !== undefined &&
    (foundations === undefined || foundations.sessions === 0);
  const active = value?.groups.find((item) => item.group.id === value.active?.id);

  const openGroup = async (group: Group) => {
    await service.activate(group.id);
    router.push(sessionHref(group.position.track, group.position.session));
  };

  const openTrack = (track: 'foundations' | 'training') => {
    const position = active?.group.position;
    const session = position !== undefined && position.track === track ? position.session : 1;
    router.push(sessionHref(track, session));
  };

  const addGroup = (
    <GlassButton
      size="sm"
      accessibilityLabel={words.t('formation.groups.addLabel')}
      leading={<Icon name="plus" size={theme.space.sp8} />}
      onPress={() => router.push('/formation/groups')}
    >
      {words.t('formation.groups.add')}
    </GlassButton>
  );

  return (
    <Screen
      tabBar
      title={words.t('formation.title')}
      overline={
        languageName === undefined
          ? undefined
          : words.t('formation.overline', {
              language: languageName,
              coverage: coverageOf(words, foundations),
            })
      }
      trailing={addGroup}
    >
      {overview.failure === undefined ? null : (
        <ThemedText variant="caption" tone="body">
          {words.t(`failure.${overview.failure}`)}
        </ThemedText>
      )}
      {nothing ? (
        <Card level={1}>
          <ThemedText variant="body" tone="title">
            {words.t('state.notDownloaded', { language: languageName })}
          </ThemedText>
          <GlassButton variant="dark" onPress={() => router.push('/languages')}>
            {words.t('state.notDownloaded.action', { language: languageName })}
          </GlassButton>
        </Card>
      ) : null}
      <SectionTitle>{words.t('formation.groups.title')}</SectionTitle>
      {value !== undefined && value.groups.length === 0 ? (
        <Card level={1}>
          <ThemedText variant="body" tone="body">
            {words.t('formation.groups.empty')}
          </ThemedText>
          <GlassButton onPress={() => router.push('/formation/groups')}>
            {words.t('formation.groups.addLabel')}
          </GlassButton>
        </Card>
      ) : null}
      {(value?.groups ?? []).map(({ group, progress }) => (
        <ListRow
          key={group.id}
          title={group.name}
          detail={groupLine(words, group, progress)}
          selected={group.id === value?.active?.id}
          leading={<Icon name={group.id === value?.active?.id ? 'check' : 'users'} />}
          below={
            progress === undefined ? null : (
              <Progress fraction={progress.fraction} label={groupLine(words, group, progress)} />
            )
          }
          onPress={() => openGroup(group)}
        />
      ))}
      {foundations === undefined || foundations.sessions === 0 ? null : (
        <>
          <SectionTitle>{words.t('formation.tracks.title')}</SectionTitle>
          <FoundationsCard
            words={words}
            sessions={foundations.sessions}
            progress={active?.progress?.track === 'foundations' ? active.progress : undefined}
            onOpen={() => openTrack('foundations')}
          />
        </>
      )}
      {training === undefined || training.sessions === 0 ? null : (
        <ListRow
          title={words.t('formation.training')}
          detail={words.t('formation.training.about')}
          leading={<Icon name="compass" />}
          onPress={() => openTrack('training')}
        />
      )}
      {topics === undefined || topics.sessions === 0 ? null : (
        <ListRow
          title={words.t('formation.topics')}
          detail={words.t('formation.topics.about')}
          leading={<Icon name="layers" />}
        />
      )}
    </Screen>
  );
}

type FoundationsCardProps = {
  words: FormationWords;
  sessions: number;
  progress: GroupProgress | undefined;
  onOpen: () => void;
};

function FoundationsCard({ words, sessions, progress, onOpen }: FoundationsCardProps) {
  const theme = useTheme();
  const title = words.t('formation.foundations.about');
  const count = words.plural('formation.foundations.count', sessions);
  return (
    <GlassSurface level={2} blur="strong" shadow="card" style={{ padding: theme.space.sp5 }}>
      <PictureWell>
        <ThemedText variant="overline" tone="onImage">
          {count}
        </ThemedText>
        <ThemedText variant="cardTitle" tone="onImage">
          {title}
        </ThemedText>
      </PictureWell>
      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: theme.space.sp4,
          paddingHorizontal: theme.space.sp4,
          paddingTop: theme.space.sp6,
          paddingBottom: theme.space.sp3,
        }}
      >
        <ThemedText variant="label" tone="body" style={{ flexShrink: 1 }}>
          {words.t('formation.foundations.tagline')}
        </ThemedText>
        {progress === undefined ? null : (
          <ThemedText variant="caption" tone="dim">
            {words.t('formation.foundations.done', { done: progress.done, total: progress.sessions })}
          </ThemedText>
        )}
      </View>
      <GlassButton full variant="dark" accessibilityLabel={`${count}, ${title}`} onPress={onOpen}>
        {words.t('common.open')}
      </GlassButton>
    </GlassSurface>
  );
}
