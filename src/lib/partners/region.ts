import type { DeviceLocale } from '../ports';

const unitedStatesZones: readonly string[] = Object.freeze([
  'America/New_York',
  'America/Detroit',
  'America/Chicago',
  'America/Menominee',
  'America/Denver',
  'America/Boise',
  'America/Phoenix',
  'America/Los_Angeles',
  'America/Anchorage',
  'America/Juneau',
  'America/Sitka',
  'America/Metlakatla',
  'America/Yakutat',
  'America/Nome',
  'America/Adak',
  'America/Fort_Wayne',
  'America/Indianapolis',
  'America/Louisville',
  'America/Knox_IN',
  'America/Shiprock',
  'Pacific/Honolulu',
  'Navajo',
]);

const unitedStatesZonePrefixes: readonly string[] = Object.freeze([
  'America/Indiana/',
  'America/Kentucky/',
  'America/North_Dakota/',
  'US/',
]);

export function isUnitedStatesZone(timeZone: string): boolean {
  return (
    unitedStatesZones.includes(timeZone) ||
    unitedStatesZonePrefixes.some((prefix) => timeZone.startsWith(prefix))
  );
}

function regionAllowsUnitedStates(region: string | undefined): boolean {
  return region === undefined || region.toUpperCase() === 'US';
}

export function inUnitedStates(locale: DeviceLocale): boolean {
  return isUnitedStatesZone(locale.timeZone) && regionAllowsUnitedStates(locale.region);
}
