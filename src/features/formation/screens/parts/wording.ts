import type { Href } from 'expo-router';
import type {
  FormationWords,
  Group,
  MovementSection,
  Progress,
  SessionMovementId,
  Track,
} from '../../service';

export function sessionHref(track: Track, session: number): Href {
  return `/formation/session/${track}/${session}`;
}

export function storyShareHref(story: number): Href {
  return { pathname: '/share', params: { kind: 'story', number: String(story) } };
}

export function movementTitle(words: FormationWords, movement: SessionMovementId): string {
  return words.t(`movement.${movement}`);
}

export function sectionTitle(words: FormationWords, id: MovementSection['id']): string {
  switch (id) {
    case 'key-idea':
      return words.t('session.keyIdea');
    case 'creedal-verse':
      return words.t('session.creedalVerse');
    case 'summary':
      return words.t('session.summary');
    case 'drafting':
      return words.t('session.drafting');
    case 'checking':
      return words.t('session.checking');
    case 'conclusion':
      return words.t('session.conclusion');
    default:
      return movementTitle(words, id);
  }
}

export function groupLine(words: FormationWords, group: Group, progress: Progress | undefined): string {
  const total = progress?.sessions ?? 0;
  const { position } = group;
  if (position.track === 'foundations') {
    return words.t('formation.group.progress', {
      story: Math.min(position.session, Math.max(total, 1)),
      total,
      movement: movementTitle(words, position.movement ?? 'observation'),
    });
  }
  return words.t('formation.training.lesson', { number: position.session, total });
}
