import type { DevicePlatform } from '@lib/ports';
import { messageOf, portError } from './errors';

export type BackupFlag = {
  excludeFromBackup(location: string): boolean;
  isExcludedFromBackup(location: string): boolean;
};

export type BackupExclusion = {
  platform: DevicePlatform;
  flag: () => BackupFlag;
  directories: readonly string[];
};

export function excludeFromBackup(exclusion: BackupExclusion): void {
  if (exclusion.platform !== 'ios') {
    return;
  }
  let flag: BackupFlag;
  try {
    flag = exclusion.flag();
  } catch (error) {
    throw portError('files.io', `backup exclusion is not in this build: ${messageOf(error)}`);
  }
  for (const directory of exclusion.directories) {
    let excluded: boolean;
    try {
      excluded = flag.excludeFromBackup(directory);
    } catch (error) {
      throw portError('files.io', `${directory} could not be kept out of backups: ${messageOf(error)}`);
    }
    if (!excluded) {
      throw portError('files.io', `${directory} still reads as included in backups`);
    }
  }
}
