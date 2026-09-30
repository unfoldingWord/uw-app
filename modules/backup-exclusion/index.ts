import { requireNativeModule } from 'expo';

export type BackupExclusionModule = {
  excludeFromBackup(location: string): boolean;
  isExcludedFromBackup(location: string): boolean;
};

export function backupExclusionModule(): BackupExclusionModule {
  return requireNativeModule<BackupExclusionModule>('BackupExclusion');
}
