import type { StartFault } from '@lib/faults';
import { allowedHostsFor } from '@lib/network';
import type { JournalResume } from '@lib/journal/journal';
import { createKernel, type Kernel } from '@lib/kernel';
import type { AppPackage, Clock, DeviceLocale, DevicePlatform, Ids } from '@lib/ports';
import type { LocaleGate } from '@lib/strings/locales';
import { createMemoryAudio, type MemoryAudio } from './adapters/audio';
import { createMemoryDb, type MemoryDb } from './adapters/db';
import { createMemoryFiles, type MemoryFiles } from './adapters/files';
import { createMemoryHttp, type MemoryHttp, type MemoryNetwork } from './adapters/http';
import { createMemoryIds } from './adapters/ids';
import { createMemoryKv, type MemoryKv } from './adapters/kv';
import { createMemoryLocale, type MemoryLocale } from './adapters/locale';
import { createMemoryPicker, type MemoryPicker } from './adapters/picker';
import { createMemoryShareSheet, type MemoryShareSheet } from './adapters/share-sheet';
import type { MemoryTransport, TransportBus } from './adapters/transport';
import { migrations } from './migrations';

export type DeviceOptions = {
  platform?: DevicePlatform;
  journalLimit?: number;
  locale?: Partial<DeviceLocale>;
  capacity?: number;
  clock?: Clock;
  ids?: Ids;
  resume?: JournalResume;
  localeGate?: LocaleGate;
  startFaults?: readonly StartFault[];
  telemetryEndpoint?: string;
};

export type SimAdapters = {
  clock: Clock;
  ids: Ids;
  files: MemoryFiles;
  db: MemoryDb;
  kv: MemoryKv;
  http: MemoryHttp;
  transport: MemoryTransport;
  audio: MemoryAudio;
  shareSheet: MemoryShareSheet;
  picker: MemoryPicker;
  locale: MemoryLocale;
};

export type SimDevice = {
  readonly name: string;
  readonly adapters: SimAdapters;
  readonly kernel: Kernel;
  start(): Promise<void>;
  restart(): Promise<void>;
};

export type DeviceWorld = { clock: Clock; network: MemoryNetwork; bus: TransportBus };

export const simAppPackage: AppPackage = {
  source: 'file:///data/app/org.unfoldingword.app/base.apk',
  bytes: 96 * 1024,
};

export function createSimDevice(name: string, world: DeviceWorld, options: DeviceOptions = {}): SimDevice {
  const platform = options.platform ?? 'android';
  const files = createMemoryFiles(options.capacity === undefined ? {} : { capacity: options.capacity });
  const adapters: SimAdapters = {
    clock: options.clock ?? world.clock,
    ids: options.ids ?? createMemoryIds(),
    files,
    db: createMemoryDb(),
    kv: createMemoryKv(),
    http: createMemoryHttp({
      network: world.network,
      files,
      hosts: allowedHostsFor(options.telemetryEndpoint),
    }),
    transport: world.bus.transport(
      platform === 'android'
        ? {
            platform,
            appPackage: () =>
              files.externalBytes(simAppPackage.source) === undefined ? undefined : simAppPackage,
          }
        : { platform },
    ),
    audio: createMemoryAudio({ clock: world.clock }),
    shareSheet: createMemoryShareSheet(),
    picker: createMemoryPicker(),
    locale: createMemoryLocale(options.locale),
  };
  const boot = (faults: readonly StartFault[] = []): Kernel =>
    createKernel(adapters, {
      migrations,
      ...(faults.length === 0 ? {} : { faults }),
      ...(options.journalLimit === undefined ? {} : { journalLimit: options.journalLimit }),
      ...(options.resume === undefined ? {} : { resume: options.resume }),
      ...(options.localeGate === undefined ? {} : { localeGate: options.localeGate }),
      ...(options.telemetryEndpoint === undefined ? {} : { telemetryEndpoint: options.telemetryEndpoint }),
    });
  let kernel = boot(options.startFaults);
  return {
    name,
    adapters,
    get kernel() {
      return kernel;
    },
    start: () => kernel.start(),
    async restart() {
      kernel = boot();
      await kernel.start();
    },
  };
}
