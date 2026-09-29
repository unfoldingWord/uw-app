import type { Clock } from '@lib/ports';

function twoDigits(value: number): string {
  return String(value).padStart(2, '0');
}

export function localDayOf(at: number): string {
  const date = new Date(at);
  return `${date.getFullYear()}-${twoDigits(date.getMonth() + 1)}-${twoDigits(date.getDate())}`;
}

export function createPlatformClock(): Clock {
  return { now: () => Date.now(), dayOf: localDayOf };
}
