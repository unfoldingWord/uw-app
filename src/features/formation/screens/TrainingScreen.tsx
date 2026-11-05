import { useRouter } from 'expo-router';
import { useCallback } from 'react';
import { GlassButton, Icon } from '@shared/glass';
import { useService } from '@shared/kernel';
import { Card, ListRow, Loading, Screen, ThemedText } from '@shared/ui';
import { createFormationService } from '../service';
import { courseOf, currentLesson, lessonLine, manualHref, standingIcons } from './parts/course';
import { useLoad } from './parts/useLoad';
import { sessionHref } from './parts/wording';

export default function TrainingScreen() {
  const service = useService(createFormationService);
  const router = useRouter();
  const words = service.words();
  const load = useCallback(() => courseOf(service), [service]);
  const loaded = useLoad(load);
  const course = loaded.value;
  const current = course === undefined ? undefined : currentLesson(course);
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
      {course === undefined || current === undefined ? null : (
        <ListRow
          title={current.title}
          detail={lessonLine(words, course.group, current)}
          selected
          leading={<Icon name={standingIcons.current} />}
          onPress={() => router.push(sessionHref('training', current.number))}
        />
      )}
      {(course?.outline.units ?? []).map((unit) => (
        <ListRow
          key={unit.manual}
          title={unit.title}
          detail={words.plural('formation.training.unit.count', unit.lessons.length)}
          leading={<Icon name="layers" />}
          onPress={() => router.push(manualHref(unit.manual))}
        />
      ))}
      {loaded.failure === undefined ? null : (
        <ThemedText variant="caption" tone="body">
          {words.t(`failure.${loaded.failure}`)}
        </ThemedText>
      )}
    </Screen>
  );
}
