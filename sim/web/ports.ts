import type { Db, DevicePlatform, Files, Http, HttpDownload, HttpRequest, Kv, Ports } from '@lib/ports';
import { createMemoryAudio } from '@sim/adapters/audio';
import { createMemoryClock } from '@sim/adapters/clock';
import { createMemoryFiles } from '@sim/adapters/files';
import { createMemoryHttp, createMemoryNetwork, type MemoryNetwork } from '@sim/adapters/http';
import { createMemoryIds } from '@sim/adapters/ids';
import { createMemoryKv, type MemoryKv } from '@sim/adapters/kv';
import { createMemoryLocale } from '@sim/adapters/locale';
import { createMemoryShareSheet } from '@sim/adapters/share-sheet';
import { createSqlDb, type SqlEngine } from '@sim/adapters/sql-db';
import { createTransportBus } from '@sim/adapters/transport';
import { decodeBytes, imagePath, sqlWasmPath, type DeviceImage } from './image';
import { openSqlEngine } from './sqljs';

type HostPolicy = { permits(url: string): boolean; hostOf(url: string): string | undefined };

type Harness = { uwQaVariant?: string };

const harnessPlatform: DevicePlatform = 'android';

const harnessAppPackage = { path: 'app/unfoldingword.apk', bytes: 96 * 1024 };

const mimeTypes: Readonly<Record<string, string>> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  mp3: 'audio/mpeg',
};

function variantOf(): string {
  return (globalThis as Harness).uwQaVariant ?? 'home';
}

function after<A extends unknown[], R>(
  ready: Promise<unknown>,
  work: (...args: A) => Promise<R>,
): (...args: A) => Promise<R> {
  return async (...args) => {
    await ready;
    return work(...args);
  };
}

async function loadImage(variant: string): Promise<DeviceImage> {
  const response = await fetch(`/${imagePath(variant)}`);
  if (!response.ok) {
    throw new Error(`the QA harness has no device image ${variant}; run npm run shots`);
  }
  return (await response.json()) as DeviceImage;
}

function blobUrl(path: string, bytes: Uint8Array): string {
  const extension = path.slice(path.lastIndexOf('.') + 1).toLowerCase();
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return URL.createObjectURL(new Blob([copy.buffer], { type: mimeTypes[extension] ?? '' }));
}

function servedFrom(image: DeviceImage, network: MemoryNetwork): void {
  for (const route of image.routes) {
    network.serve(route.url, {
      body: decodeBytes(route.body),
      ...(route.status === undefined ? {} : { status: route.status }),
      ...(route.headers === undefined ? {} : { headers: route.headers }),
      ...(route.redirect === undefined ? {} : { redirect: route.redirect }),
    });
  }
}

async function restore(image: DeviceImage, files: Files, kv: MemoryKv, pictures: Map<string, string>) {
  for (const directory of image.directories) {
    await files.mkdir(directory);
  }
  for (const file of image.files) {
    const bytes = decodeBytes(file.body);
    await files.writeBytes(file.path, bytes);
    if (mimeTypes[file.path.slice(file.path.lastIndexOf('.') + 1).toLowerCase()] !== undefined) {
      pictures.set(file.path, blobUrl(file.path, bytes));
    }
  }
  for (const [key, value] of Object.entries(image.kv)) {
    await kv.set(key, value);
  }
}

function gatedFiles(ready: Promise<unknown>, files: Files, pictures: Map<string, string>): Files {
  return {
    readBytes: after(ready, files.readBytes),
    readText: after(ready, files.readText),
    readRange: after(ready, files.readRange),
    writeBytes: after(ready, files.writeBytes),
    appendBytes: after(ready, files.appendBytes),
    writeText: after(ready, files.writeText),
    list: after(ready, files.list),
    exists: after(ready, files.exists),
    size: after(ready, files.size),
    mkdir: after(ready, files.mkdir),
    rename: after(ready, files.rename),
    remove: after(ready, files.remove),
    adopt: after(ready, files.adopt),
    freeSpace: after(ready, files.freeSpace),
    uriOf: (path) => (files.uriOf(path) === undefined ? undefined : pictures.get(path)),
  };
}

function gatedKv(ready: Promise<unknown>, kv: Kv): Kv {
  return {
    get: after(ready, kv.get),
    set: after(ready, kv.set),
    delete: after(ready, kv.delete),
    keys: after(ready, kv.keys),
  };
}

function gatedDb(ready: Promise<unknown>, db: Db): Db {
  return {
    exec: after(ready, db.exec),
    run: after(ready, db.run),
    all: after(ready, db.all),
    get: after(ready, db.get),
    transaction: after(ready, db.transaction),
  };
}

function gatedHttp(ready: Promise<unknown>, http: Http, policy: HostPolicy): Http {
  const refused = (url: string) => ({ kind: 'refused', host: policy.hostOf(url) }) as const;
  return {
    request: after(ready, (request: HttpRequest) =>
      policy.permits(request.url) ? http.request(request) : Promise.resolve(refused(request.url)),
    ),
    download: after(ready, (request: HttpDownload) =>
      policy.permits(request.url) ? http.download(request) : Promise.resolve(refused(request.url)),
    ),
    online: after(ready, http.online),
  };
}

function lazyEngine(engine: Promise<SqlEngine>): { engine: SqlEngine; ready: Promise<void> } {
  let current: SqlEngine | undefined;
  const opened = (): SqlEngine => {
    if (current === undefined) {
      throw new Error('the QA harness database is not open yet');
    }
    return current;
  };
  return {
    engine: {
      exec: (sql) => opened().exec(sql),
      run: (sql, params) => opened().run(sql, params),
      all: (sql, params) => opened().all(sql, params),
      get: (sql, params) => opened().get(sql, params),
      close: () => opened().close(),
    },
    ready: engine.then((value) => {
      current = value;
    }),
  };
}

export function devicePlatform(): DevicePlatform {
  return harnessPlatform;
}

export function createPlatformPorts(policy: HostPolicy): Ports {
  const clock = createMemoryClock();
  const locale = createMemoryLocale();
  const files = createMemoryFiles();
  const kv = createMemoryKv();
  const network = createMemoryNetwork();
  const http = createMemoryHttp({ network, files });
  const pictures = new Map<string, string>();
  const image = loadImage(variantOf());
  const sql = lazyEngine(image.then((loaded) => openSqlEngine(decodeBytes(loaded.db), `/${sqlWasmPath}`)));
  const ready = Promise.all([image, sql.ready]).then(async ([loaded]) => {
    clock.set(loaded.at);
    locale.set(loaded.locale);
    servedFrom(loaded, network);
    await restore(loaded, files, kv, pictures);
  });
  const bus = createTransportBus();
  return {
    clock,
    ids: createMemoryIds('qa'),
    files: gatedFiles(ready, files, pictures),
    db: gatedDb(ready, createSqlDb(sql.engine)),
    kv: gatedKv(ready, kv),
    http: gatedHttp(ready, http, policy),
    transport: bus.transport({ platform: harnessPlatform, appPackage: harnessAppPackage }),
    audio: createMemoryAudio({ clock }),
    shareSheet: createMemoryShareSheet(),
    locale,
  };
}
