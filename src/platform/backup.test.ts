import { describe, expect, it } from 'vitest';
import { excludeFromBackup, type BackupFlag } from './backup';
import { isPortError } from './errors';

const deviceRoot = 'file:///var/mobile/Containers/Data/Application/A/Documents/device/';
const databaseDirectory = 'file:///var/mobile/Containers/Data/Application/A/Documents/SQLite/';

function flagOn(options: { refuse?: string; stuck?: string } = {}): BackupFlag & { set: string[] } {
  const excluded = new Set<string>();
  const set: string[] = [];
  return {
    set,
    excludeFromBackup(location) {
      set.push(location);
      if (location === options.refuse) {
        throw new Error('The file could not be saved');
      }
      if (location !== options.stuck) {
        excluded.add(location);
      }
      return excluded.has(location);
    },
    isExcludedFromBackup: (location) => excluded.has(location),
  };
}

function caught(work: () => unknown): unknown {
  try {
    work();
  } catch (error) {
    return error;
  }
  return undefined;
}

describe('excludeFromBackup', () => {
  it('sets the flag on the device root and the database directory on iOS and reads it back', () => {
    const flag = flagOn();
    excludeFromBackup({ platform: 'ios', flag: () => flag, directories: [deviceRoot, databaseDirectory] });
    expect(flag.set).toEqual([deviceRoot, databaseDirectory]);
    expect(flag.isExcludedFromBackup(deviceRoot)).toBe(true);
    expect(flag.isExcludedFromBackup(databaseDirectory)).toBe(true);
  });

  it('does nothing on Android, where allowBackup false and the data extraction rules cover the app', () => {
    const flag = flagOn();
    let asked = false;
    excludeFromBackup({
      platform: 'android',
      flag: () => {
        asked = true;
        return flag;
      },
      directories: [deviceRoot, databaseDirectory],
    });
    expect(asked).toBe(false);
    expect(flag.set).toEqual([]);
  });

  it('refuses to start when iOS refuses the flag, so nothing is written where a backup reaches it', () => {
    const error = caught(() =>
      excludeFromBackup({
        platform: 'ios',
        flag: () => flagOn({ refuse: databaseDirectory }),
        directories: [deviceRoot, databaseDirectory],
      }),
    );
    expect(isPortError(error)).toBe(true);
    expect(error).toMatchObject({ code: 'files.io' });
    expect(String(error)).toContain(`${databaseDirectory} could not be kept out of backups`);
  });

  it('refuses to start when the flag does not read back true', () => {
    const error = caught(() =>
      excludeFromBackup({
        platform: 'ios',
        flag: () => flagOn({ stuck: deviceRoot }),
        directories: [deviceRoot, databaseDirectory],
      }),
    );
    expect(error).toMatchObject({ code: 'files.io' });
    expect(String(error)).toContain(`${deviceRoot} still reads as included in backups`);
  });

  it('refuses to start when the native module is missing from the build', () => {
    const error = caught(() =>
      excludeFromBackup({
        platform: 'ios',
        flag: () => {
          throw new Error("Cannot find native module 'BackupExclusion'");
        },
        directories: [deviceRoot],
      }),
    );
    expect(error).toMatchObject({ code: 'files.io' });
    expect(String(error)).toContain('BackupExclusion');
  });
});
