import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { DeviceLocale } from '@lib/ports';
import { createMemoryClock } from '@sim/adapters/clock';
import { createMemoryNetwork, type MemoryNetwork, type Route } from '@sim/adapters/http';
import { createTransportBus } from '@sim/adapters/transport';
import { createSimDevice, type SimDevice } from '@sim/device';
import { serveFixtures } from '@sim/fixtures/serve';
import { servicesOf } from '@sim/services';
import {
  encodeBytes,
  harnessLocaleGate,
  imagePath,
  type DeviceImage,
  type ImageRoute,
  type ImageVariant,
} from '@sim/web/image';

export const harnessMoment = Date.UTC(2026, 8, 29, 8, 20, 0);

const englishLocale: DeviceLocale = { tag: 'en', region: 'US', timeZone: 'UTC', rtl: false };

const arabicLocale: DeviceLocale = { tag: 'ar', region: 'EG', timeZone: 'UTC', rtl: true };

const urduLocale: DeviceLocale = { tag: 'ur', region: 'PK', timeZone: 'UTC', rtl: true };

const hindiLocale: DeviceLocale = { tag: 'hi', region: 'IN', timeZone: 'UTC', rtl: false };

function deviceLocaleFor(variant: ImageVariant): DeviceLocale {
  switch (variant) {
    case 'rtl':
    case 'fresh-rtl':
      return arabicLocale;
    case 'ur':
      return urduLocale;
    case 'hi':
      return hindiLocale;
    default:
      return englishLocale;
  }
}

type Recording = { network: MemoryNetwork; routes(): readonly ImageRoute[] };

function bodyOf(body: Uint8Array | string): string {
  return encodeBytes(typeof body === 'string' ? new TextEncoder().encode(body) : body);
}

function recordingNetwork(): Recording {
  const inner = createMemoryNetwork();
  const served = new Map<string, Route>();
  return {
    network: {
      serve: (url, route) => {
        served.set(url, route);
        inner.serve(url, route);
      },
      unserve: (url) => {
        served.delete(url);
        inner.unserve(url);
      },
      lookup: (url) => inner.lookup(url),
    },
    routes: () =>
      [...served.entries()].map(([url, route]) => ({
        url,
        body: bodyOf(route.body),
        ...(route.status === undefined ? {} : { status: route.status }),
        ...(route.headers === undefined ? {} : { headers: route.headers }),
        ...(route.redirect === undefined ? {} : { redirect: route.redirect }),
      })),
  };
}

async function expectOk(label: string, outcome: Promise<{ ok: boolean }>): Promise<void> {
  if (!(await outcome).ok) {
    throw new Error(`the QA device image could not ${label}`);
  }
}

async function furnish(device: SimDevice): Promise<void> {
  const services = servicesOf(device);
  await services.onboarding.refresh();
  const chosen = await services.onboarding.choose('qaa', { name: 'Grace' });
  await expectOk('install the qaa language pack', chosen.done);
  await expectOk('install the image pack', services.languages.downloadImages());
  for (const audio of services.languages.audio('qaa')) {
    await expectOk(`install ${audio.pack}`, services.languages.install(audio.pack));
  }
  const created = await services.formation.create('Tuesday group');
  const group = created?.ok === true ? created.value : undefined;
  if (group === undefined) {
    throw new Error('the QA device image could not create a group');
  }
  await services.formation.start(group.id);
  await services.study.save({ target: 'passage', reference: 'RUT 1:16', language: 'qaa' });
  await services.study.save({ target: 'article', article: 'tw/bible/kt/god', language: 'qaa' });
  await services.study.save({ target: 'story', story: 2, language: 'qaa' });
  await services.study.passage('RUT 1:16');
}

async function imageOf(
  variant: ImageVariant,
  device: SimDevice,
  recording: Recording,
  scratch: string,
): Promise<DeviceImage> {
  const database = join(scratch, `${variant}.sqlite`);
  rmSync(database, { force: true });
  await device.adapters.db.exec(`VACUUM INTO '${database.replaceAll("'", "''")}'`);
  const tree = device.adapters.files.tree();
  const files = [];
  for (const path of tree.filter((entry) => !entry.endsWith('/'))) {
    files.push({ path, body: encodeBytes(await device.adapters.files.readBytes(path)) });
  }
  return {
    variant,
    at: device.adapters.clock.now(),
    platform: 'android',
    locale: device.adapters.locale.current(),
    directories: tree.filter((entry) => entry.endsWith('/')).map((entry) => entry.slice(0, -1)),
    files,
    kv: device.adapters.kv.entries(),
    db: encodeBytes(new Uint8Array(readFileSync(database))),
    routes: recording.routes(),
  };
}

async function deviceFor(variant: ImageVariant): Promise<{ device: SimDevice; recording: Recording }> {
  const clock = createMemoryClock({ at: harnessMoment });
  const recording = recordingNetwork();
  serveFixtures(recording.network);
  const bus = createTransportBus();
  const locale = deviceLocaleFor(variant);
  const device = createSimDevice(
    `qa-${variant}`,
    { clock, network: recording.network, bus },
    { locale, localeGate: harnessLocaleGate },
  );
  await device.start();
  if (variant === 'fresh' || variant === 'fresh-rtl') {
    return { device, recording };
  }
  await furnish(device);
  const settings = servicesOf(device).settings;
  if (variant === 'reduced-blur') {
    await settings.setReducedBlur(true);
  }
  if (variant === 'rtl') {
    await settings.setLocale('ar');
  }
  if (variant === 'ur' || variant === 'hi') {
    await settings.setLocale(variant);
  }
  return { device, recording };
}

export async function writeDeviceImages(
  root: string,
  variants: readonly ImageVariant[],
): Promise<readonly string[]> {
  const scratch = join(root, '.scratch');
  mkdirSync(scratch, { recursive: true });
  const written: string[] = [];
  for (const variant of variants) {
    const { device, recording } = await deviceFor(variant);
    const image = await imageOf(variant, device, recording, scratch);
    const target = join(root, imagePath(variant));
    mkdirSync(join(target, '..'), { recursive: true });
    writeFileSync(target, JSON.stringify(image));
    written.push(target);
  }
  rmSync(scratch, { recursive: true, force: true });
  return written;
}
