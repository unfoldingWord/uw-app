import type { Href } from 'expo-router';
import type { IconName } from '@shared/glass';
import type { FormationService, FormationWords, Group, TrainingLesson, TrainingOutline } from '../../service';

export type Course = {
  readonly outline: TrainingOutline;
  readonly group: Group | undefined;
  readonly storiesOnPhone: boolean;
};

export async function courseOf(service: FormationService): Promise<Course> {
  const tracks = await service.tracks();
  const foundations = tracks.find((track) => track.track === 'foundations');
  return {
    outline: await service.trainingOutline(),
    group: service.active(),
    storiesOnPhone: foundations !== undefined && foundations.sessions > 0,
  };
}

export type Standing = 'current' | 'passed' | 'ahead';

export function standingOf(group: Group | undefined, lesson: TrainingLesson): Standing {
  if (group === undefined || group.position.track !== 'training') {
    return 'ahead';
  }
  if (group.position.session === lesson.number) {
    return 'current';
  }
  return group.position.session > lesson.number ? 'passed' : 'ahead';
}

export const standingIcons: Readonly<Record<Standing, IconName>> = {
  current: 'compass',
  passed: 'check',
  ahead: 'chevronRight',
};

export function lessonLine(words: FormationWords, group: Group | undefined, lesson: TrainingLesson): string {
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

export function currentLesson(course: Course): TrainingLesson | undefined {
  const { group } = course;
  if (group === undefined || group.position.track !== 'training') {
    return undefined;
  }
  return course.outline.units
    .flatMap((unit) => unit.lessons)
    .find((lesson) => lesson.number === group.position.session);
}

export function manualHref(manual: string): Href {
  return `/formation/manual/${encodeURIComponent(manual)}`;
}
