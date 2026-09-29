import type { SqlValue } from '@lib/ports';
import type { FileWrite } from './adapters/files';
import type { SimDevice } from './device';

export type CrashPoint = {
  db?: (sql: string, params: readonly SqlValue[]) => boolean;
  files?: (operation: FileWrite, path: string) => boolean;
};

export type Crash = { crashed(): boolean; restart(): Promise<void> };

export function crashAt(device: SimDevice, point: CrashPoint): Crash {
  const { db, files } = device.adapters;
  let crashed = false;
  const stop = (): void => {
    crashed = true;
    db.failWrites(true);
    files.failWrites(true);
  };
  const unsubscribe = [
    db.onWrite((sql, params) => {
      if (!crashed && point.db?.(sql, params) === true) {
        stop();
      }
    }),
    files.onWrite((operation, path) => {
      if (!crashed && point.files?.(operation, path) === true) {
        stop();
      }
    }),
  ];
  return {
    crashed: () => crashed,
    async restart() {
      unsubscribe.forEach((release) => release());
      db.failWrites(false);
      files.failWrites(false);
      await device.restart();
    },
  };
}
