import { Platform } from 'react-native';
import type { DevicePlatform, Ports } from '@lib/ports';
import { backupExclusionModule } from '@modules/backup-exclusion';
import { createPlatformAudio } from './audio';
import { excludeFromBackup } from './backup';
import { createPlatformClock } from './clock';
import { createDatabaseDirectory, createPlatformDb } from './db';
import { createDeviceRoot, createPlatformFiles } from './files';
import { createPlatformHttp, type HostPolicy } from './http';
import { createPlatformIds } from './ids';
import { createPlatformKv } from './kv';
import { createPlatformLocale } from './locale';
import { createPlatformPicker } from './picker';
import { createPlatformShareSheet } from './share-sheet';
import { createPlatformTransport } from './transport';

export const localeGate = 'reviewed';

function devicePlatform(): DevicePlatform {
  return Platform.OS === 'ios' ? 'ios' : 'android';
}

export function createPlatformPorts(policy: HostPolicy): Ports {
  const platform = devicePlatform();
  const root = createDeviceRoot();
  excludeFromBackup({
    platform,
    flag: backupExclusionModule,
    directories: [root.directory.uri, createDatabaseDirectory()],
  });
  const files = createPlatformFiles(root);
  const http = createPlatformHttp({ policy, files });
  return {
    clock: createPlatformClock(),
    ids: createPlatformIds(),
    files,
    db: createPlatformDb(),
    kv: createPlatformKv(),
    http,
    transport: createPlatformTransport({ platform, uriOf: root.uriOf }),
    audio: createPlatformAudio({ uriOf: root.uriOf }),
    shareSheet: createPlatformShareSheet({ platform, uriOf: root.uriOf }),
    picker: createPlatformPicker(),
    locale: createPlatformLocale(),
  };
}
