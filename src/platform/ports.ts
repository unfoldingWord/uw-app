import { Platform } from 'react-native';
import type { DevicePlatform, Ports } from '@lib/ports';
import { createPlatformAudio } from './audio';
import { createPlatformClock } from './clock';
import { createPlatformDb } from './db';
import { createDeviceRoot, createPlatformFiles } from './files';
import { createPlatformHttp, type HostPolicy } from './http';
import { createPlatformIds } from './ids';
import { createPlatformKv } from './kv';
import { createPlatformLocale } from './locale';
import { createPlatformShareSheet } from './share-sheet';
import { createPlatformTransport } from './transport';

export function devicePlatform(): DevicePlatform {
  return Platform.OS === 'ios' ? 'ios' : 'android';
}

export function createPlatformPorts(policy: HostPolicy): Ports {
  const platform = devicePlatform();
  const root = createDeviceRoot();
  const files = createPlatformFiles(root);
  const http = createPlatformHttp({ policy, files });
  return {
    clock: createPlatformClock(),
    ids: createPlatformIds(),
    files,
    db: createPlatformDb(),
    kv: createPlatformKv(),
    http,
    transport: createPlatformTransport(platform),
    audio: createPlatformAudio({ policy, http, uriOf: root.uriOf }),
    shareSheet: createPlatformShareSheet({ platform, uriOf: root.uriOf }),
    locale: createPlatformLocale(),
  };
}
