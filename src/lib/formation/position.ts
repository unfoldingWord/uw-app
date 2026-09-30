import { sessionMovements } from '../domain/events';
import type { Position, Progress, SessionMovementId, Track } from './types';

export const firstPosition: Position = Object.freeze({
  track: 'foundations',
  session: 1,
  movement: 'observation',
});

const movementsPerSession = sessionMovements.length;

export function positionAt(track: Track, session: number, movement?: SessionMovementId): Position {
  return track === 'foundations'
    ? { track, session, movement: movement ?? 'observation' }
    : { track, session };
}

export function isReachable(position: Position): boolean {
  return (
    position.track !== 'topics' &&
    Number.isSafeInteger(position.session) &&
    position.session >= 1 &&
    (position.movement === undefined || sessionMovements.includes(position.movement)) &&
    (position.track === 'foundations' || position.movement === undefined)
  );
}

export type Step = { readonly next: Position; readonly sessionCompleted: boolean };

export function stepFrom(position: Position): Step {
  if (position.track === 'foundations') {
    const index = sessionMovements.indexOf(position.movement ?? 'observation');
    const following = sessionMovements[index + 1];
    return following === undefined
      ? { next: positionAt('foundations', position.session + 1), sessionCompleted: true }
      : { next: positionAt('foundations', position.session, following), sessionCompleted: false };
  }
  return { next: positionAt(position.track, position.session + 1), sessionCompleted: true };
}

export function progressOf(position: Position, sessions: number): Progress {
  const per = position.track === 'foundations' ? movementsPerSession : 1;
  const within =
    position.track === 'foundations' ? sessionMovements.indexOf(position.movement ?? 'observation') : 0;
  const total = sessions * per;
  const reached = (position.session - 1) * per + within;
  return {
    track: position.track,
    done: Math.min(sessions, position.session - 1),
    sessions,
    fraction: total === 0 ? 0 : Math.min(1, reached / total),
    finished: sessions > 0 && position.session > sessions,
  };
}
