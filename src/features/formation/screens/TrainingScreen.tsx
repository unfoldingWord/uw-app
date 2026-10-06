import { useRouter } from 'expo-router';
import { Fragment, useCallback } from 'react';
import { GlassButton, Icon, type IconName } from '@shared/glass';
import { useService } from '@shared/kernel';
import { Card, ListRow, Loading, Screen, SectionTitle, ThemedText } from '@shared/ui';
import {
  createFormationService,
  type FormationService,
  type FormationWords,
  type Group,
  type TrainingLesson,
  type TrainingOutline,
} from '../service';
import { useLoad } from './parts/useLoad';
import { sessionHref } from './parts/wording';

type Course = {
  readonly outline: TrainingOutline;
  readonly group: Group | undefined;
  readonly storiesOnPhone: boolean;
};

async function courseOf(service: FormationService): Promise<Course> {
  const tracks = await service.tracks();
  const foundations = tracks.find((track) => track.track === 'foundations');
  return {
    outline: await service.trainingOutline(),
    group: service.active(),
    storiesOnPhone: foundations !== undefined && foundations.sessions > 0,
  };
}

type Standing = 'current' | 'passed' | 'ahead';

function standingOf(group: Group | undefined, lesson: TrainingLesson): Standing {
  if (group === undefined || group.position.track !== 'training') {
    return 'ahead';
  }
  if (group.position.session === lesson.number) {
    return 'current';
  }
  return group.position.session > lesson.number ? 'passed' : 'ahead';
}

const standingIcons: Readonly<Record<Standing, IconName>> = {
  current: 'compass',
  passed: 'check',
  ahead: 'chevronRight',
};

function lessonLine(words: FormationWords, group: Group | undefined, lesson: TrainingLesson): string {
  const number = words.t('formation.training.lessonNumber', { number: lesson.number });
  const standing = standingOf(group, lesson);
  if (standing === 'current' && group !== undefined) {
    return words.t('common.joined', {
      first: number,
      second: words.t('formation.training.current', { group: group.name }),
    });
  }
  return standing === 'passed'
    ? words.t('common.joined', { first: number, second: words.t('common.done') })
    : number;
}

export default function TrainingScreen() {
  const service = useService(createFormationService);
  const router = useRouter();
  const words = service.words();
  const load = useCallback(() => courseOf(service), [service]);
  const loaded = useLoad(load);
  const course = loaded.value;
  const group = course?.group;
  const language = service.language();
  const languageName = language === undefined ? '' : service.languageName(language);
  const back = { label: words.t('common.back'), onPress: () => router.back() };

  return (
    <Screen title={words.t('formation.training')} subtitle={words.t('formation.training.about')} back={back}>
      {course === undefined && loaded.loading ? <Loading label={words.t('common.busy')} /> : null}
      {course !== undefined && course.outline.lessons === 0 && course.storiesOnPhone ? (
        <Card level={1}>
          <ThemedText variant="body" tone="title">
            {words.t('formation.training.empty', { language: languageName })}
          </ThemedText>
        </Card>
      ) : null}
      {course !== undefined && course.outline.lessons === 0 && !course.storiesOnPhone ? (
        <Card level={1}>
          <ThemedText variant="body" tone="title">
            {words.t('state.notDownloaded', { language: languageName })}
          </ThemedText>
          <GlassButton variant="dark" onPress={() => router.push('/languages')}>
            {words.t('state.notDownloaded.action', { language: languageName })}
          </GlassButton>
        </Card>
      ) : null}
      {(course?.outline.units ?? []).map((unit) => (
        <Fragment key={unit.manual}>
          <SectionTitle trailing={words.plural('formation.training.unit.count', unit.lessons.length)}>
            {unit.title}
          </SectionTitle>
          {unit.lessons.map((lesson) => {
            const standing = standingOf(group, lesson);
            return (
              <ListRow
                key={lesson.id}
                title={lesson.title}
                detail={lessonLine(words, group, lesson)}
                selected={standing === 'current'}
                leading={<Icon name={standingIcons[standing]} />}
                onPress={() => router.push(sessionHref('training', lesson.number))}
              />
            );
          })}
        </Fragment>
      ))}
      {loaded.failure === undefined ? null : (
        <ThemedText variant="caption" tone="body">
          {words.t(`failure.${loaded.failure}`)}
        </ThemedText>
      )}
    </Screen>
  );
}
