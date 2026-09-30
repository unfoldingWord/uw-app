import type { DeviceLocale, Locale } from '@lib/ports';

export type MemoryLocale = Locale & { set(locale: Partial<DeviceLocale>): void };

export const defaultSimLocale: DeviceLocale = Object.freeze({
  tag: 'en',
  region: undefined,
  timeZone: 'UTC',
  rtl: false,
});

export function createMemoryLocale(initial: Partial<DeviceLocale> = {}): MemoryLocale {
  let current: DeviceLocale = { ...defaultSimLocale, ...initial };
  return {
    current: () => current,
    set: (locale) => {
      current = { ...current, ...locale };
    },
  };
}
