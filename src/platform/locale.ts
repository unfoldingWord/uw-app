import { getCalendars, getLocales } from 'expo-localization';
import type { DeviceLocale, Locale } from '@lib/ports';

const fallbackTag = 'en';
const fallbackTimeZone = 'UTC';

export function createPlatformLocale(): Locale {
  return {
    current(): DeviceLocale {
      const [first] = getLocales();
      const [calendar] = getCalendars();
      return {
        tag: first.languageTag === '' ? fallbackTag : first.languageTag,
        region: first.regionCode ?? undefined,
        timeZone: calendar.timeZone ?? fallbackTimeZone,
        rtl: first.textDirection === 'rtl',
      };
    },
  };
}
