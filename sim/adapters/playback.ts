import type { DomainEvent } from '@lib/domain/events';
import type { Clock, Ids } from '@lib/ports';

export type PlaybackClock = Clock & { remaining(): number };

export function createPlaybackClock(recorded: readonly DomainEvent[], fallback: Clock): PlaybackClock {
  let index = 0;
  const days = new Map<number, string>();
  for (const event of recorded) {
    if (event.type === 'AppOpened') {
      days.set(event.at, event.payload.day);
    }
  }
  let current: DomainEvent | undefined;
  return {
    now() {
      const event = recorded[index];
      if (event === undefined) {
        current = undefined;
        return recorded.at(-1)?.at ?? fallback.now();
      }
      index += 1;
      current = event;
      return event.at;
    },
    dayOf: (at) =>
      current?.type === 'AppOpened' && current.at === at
        ? current.payload.day
        : (days.get(at) ?? fallback.dayOf(at)),
    remaining: () => recorded.length - index,
  };
}

export function createPlaybackIds(recorded: readonly string[], fallback: Ids): Ids {
  let index = 0;
  return {
    next() {
      const id = recorded[index];
      if (id === undefined) {
        return fallback.next();
      }
      index += 1;
      return id;
    },
  };
}
