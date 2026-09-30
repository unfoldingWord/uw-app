import type { Clock } from '@lib/ports';

const minute = 60 * 1000;
const day = 24 * 60 * minute;

export const simEpoch = Date.UTC(2026, 0, 5, 9, 0, 0);

export type MemoryClock = Clock & {
  set(at: number): void;
  advance(ms: number): void;
  advanceDays(days: number): void;
  setUtcOffsetMinutes(minutes: number): void;
};

export function dayAtOffset(at: number, utcOffsetMinutes: number): string {
  return new Date(at + utcOffsetMinutes * minute).toISOString().slice(0, 10);
}

export function createMemoryClock(options: { at?: number; utcOffsetMinutes?: number } = {}): MemoryClock {
  let now = options.at ?? simEpoch;
  let offset = options.utcOffsetMinutes ?? 0;
  return {
    now: () => now,
    dayOf: (at) => dayAtOffset(at, offset),
    set: (at) => {
      now = at;
    },
    advance: (ms) => {
      now += ms;
    },
    advanceDays: (days) => {
      now += days * day;
    },
    setUtcOffsetMinutes: (minutes) => {
      offset = minutes;
    },
  };
}
