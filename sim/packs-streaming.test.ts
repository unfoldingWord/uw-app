import { describe, expect, it } from 'vitest';
import { archiveReadBytes } from '@lib/burrito/unpack';
import { imagePackId, languagePackId, originalPackId } from '@lib/domain/pack';
import { archiveUrlOf } from '@lib/domain/release';
import { readBurrito } from '@lib/packs/tree';
import { validate } from '@lib/burrito/validate';
import { packRows } from '@lib/packs/burrito';
import { importLocalBurrito, localBurritoArchive } from './burritos';
import { burritoRootOf, installFromCatalog } from './install';
import { largeText } from './large';
import { createWorld } from './world';

async function phone(capacity?: number) {
  const world = createWorld();
  const device = world.device('phone', capacity === undefined ? {} : { capacity });
  await device.start();
  return { world, device };
}

type Traffic = { largestRead: number; largestWrite: number; reads: string[]; writes: string[] };

function watch(device: Awaited<ReturnType<typeof phone>>['device']): { traffic: Traffic; stop(): void } {
  const traffic: Traffic = { largestRead: 0, largestWrite: 0, reads: [], writes: [] };
  const stops = [
    device.adapters.files.onRead((_operation, path, bytes) => {
      traffic.largestRead = Math.max(traffic.largestRead, bytes);
      traffic.reads.push(path);
    }),
    device.adapters.files.onWrite((_operation, path, bytes) => {
      if (!path.startsWith('imports/')) {
        traffic.largestWrite = Math.max(traffic.largestWrite, bytes);
      }
      traffic.writes.push(path);
    }),
  ];
  return { traffic, stop: () => stops.forEach((stop) => stop()) };
}

describe('packs install by streaming (LA-2, LA-7)', () => {
  it('builds the Image Pack reading the stories archive in bounded reads, and reports each picture (LA-3)', async () => {
    const { device } = await phone();
    await device.kernel.catalog.refresh();
    const watched = watch(device);
    const seen: string[] = [];
    const whole: string[] = [];
    const stopWhole = device.adapters.files.onRead((operation, path) => {
      if (operation !== 'range') {
        whole.push(path);
      }
    });
    const stopProgress = device.adapters.files.onWrite((_operation, path) => {
      if (path.endsWith('.jpg')) {
        const [progress] = device.kernel.packs.installing();
        seen.push(progress?.items === undefined ? 'none' : `${progress.items.done}/${progress.items.total}`);
      }
    });
    const outcome = await device.kernel.packs.installFromCatalog(imagePackId);
    stopProgress();
    stopWhole();
    watched.stop();
    expect(outcome.ok, outcome.ok ? '' : outcome.code).toBe(true);
    expect(watched.traffic.largestRead).toBeLessThanOrEqual(archiveReadBytes * 4);
    expect(
      whole.filter((path) => path.endsWith('.zip')),
      'the stories archive is never read whole into memory',
    ).toEqual([]);
    expect(seen.length).toBeGreaterThan(1);
    expect(
      seen.every((item) => /^\d+\/\d+$/.test(item)),
      seen.join(' '),
    ).toBe(true);
    const total = Number(seen[0]?.split('/')[1]);
    expect(total).toBe(seen.length);
    expect(device.kernel.packs.installing()).toEqual([]);
  });

  it('unpacks a large burrito to disk in bounded reads and writes, and what lands validates', async () => {
    const { device } = await phone();
    const text = largeText('qaz_ult', 'qaz', ['PSA', 'ISA'], 24, 18);
    const archive = localBurritoArchive(text);
    const largestIngredient = Math.max(...text.ingredients.map((item) => item.bytes.byteLength));
    expect(largestIngredient).toBeGreaterThan(4 * 1024 * 1024);
    const watched = watch(device);
    const outcome = await importLocalBurrito(device, text);
    watched.stop();
    expect(outcome.ok).toBe(true);
    expect(archive.byteLength).toBeGreaterThan(archiveReadBytes * 4);
    expect(watched.traffic.largestRead).toBeLessThanOrEqual(archiveReadBytes * 4);
    expect(watched.traffic.largestWrite).toBeLessThan(largestIngredient / 4);
    const root = burritoRootOf(device, 'qaz_ult');
    const onDisk = await readBurrito(device.adapters.files, root);
    expect(validate(onDisk, { rows: packRows })).toMatchObject({ ok: true, kind: 'valid' });
  }, 30_000);

  it('updates one resource without reading, copying or moving the burritos it keeps', async () => {
    const { world, device } = await phone();
    await installFromCatalog(device, [languagePackId('qaa')]);
    const kept = device.kernel.packs
      .installed()[0]
      ?.burritos.filter((burrito) => burrito.provenance.resource !== 'qaa_tn')
      .map((burrito) => burrito.root);
    world.fixtures.publish('unfoldingWord', 'qaa_tn', 'v2');
    await device.kernel.catalog.refresh();
    const watched = watch(device);
    const updated = await device.kernel.packs.update(languagePackId('qaa'));
    watched.stop();
    expect(updated.ok).toBe(true);
    const touched = (path: string) => (kept ?? []).some((root) => path.startsWith(root));
    expect(watched.traffic.reads.filter(touched)).toEqual([]);
    expect(watched.traffic.writes.filter(touched)).toEqual([]);
    expect(
      device.kernel.packs
        .installed()[0]
        ?.burritos.filter((burrito) => burrito.provenance.resource !== 'qaa_tn')
        .map((burrito) => burrito.root),
    ).toEqual(kept);
  });

  it('refuses before unpacking when the archive would not fit once unpacked', async () => {
    const { world, device } = await phone();
    await device.kernel.catalog.refresh();
    const url = archiveUrlOf({ publisher: 'unfoldingWord', resource: 'hbo_uhb', tag: 'v3.0.0' });
    const archive = world.network.lookup(url)?.body;
    expect(archive instanceof Uint8Array).toBe(true);
    const archiveBytes = archive instanceof Uint8Array ? archive.byteLength : 0;
    device.adapters.files.setCapacity(device.adapters.files.used() + archiveBytes + 64);
    const outcome = await device.kernel.packs.installFromCatalog(originalPackId('hbo'));
    expect(outcome).toMatchObject({ ok: false, code: 'pack.no-space' });
    expect(
      device.adapters.files.tree().filter((path) => path.startsWith('packs/') && path !== 'packs/'),
    ).toEqual([]);
  });
});
