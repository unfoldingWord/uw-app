import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { createWorld, type World } from '@sim/world';
import { carriedAssetCount, placeStandIns, readCarriedLock } from '../bundle/carried';
import { BundledUnverified, fetchBundled } from './fetch';
import {
  lockPath,
  lockText,
  parseLock,
  platformModule,
  platformModulePath,
  sha256Of,
  type BundledLock,
} from './lock';
import { resolveLock } from './resolve';
import type { ReadUrl } from './sources';

const directories: string[] = [];

function scratch(): string {
  const directory = mkdtempSync(join(tmpdir(), 'uw-bundled-'));
  directories.push(directory);
  return directory;
}

afterEach(() => {
  for (const directory of directories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

function served(world: World): ReadUrl {
  return async (url) => {
    const route = world.network.lookup(url);
    if (route === undefined || !(route.body instanceof Uint8Array)) {
      throw new Error(`${url} is not served`);
    }
    return route.body.slice();
  };
}

let fixtureLock: Promise<BundledLock> | undefined;

function qaaLock(): Promise<BundledLock> {
  fixtureLock ??= resolveLock(createWorld(), 'qaa', served(createWorld()), '2026-11-06');
  return fixtureLock;
}

describe('the bundled lock', () => {
  it('resolves the default pack and the pictures the way a download would, and reads back', async () => {
    const lock = await qaaLock();
    expect(lock.archives.map((archive) => [archive.file, archive.pack, archive.row])).toEqual([
      ['qaa_obs.zip', 'language:qaa', 'stories'],
      ['qaa_obs_sq.zip', 'language:qaa', 'storyHelps'],
      ['qaa_obs_tn.zip', 'language:qaa', 'storyHelps'],
      ['qaa_obs_twl.zip', 'language:qaa', 'storyHelps'],
      ['qaa_ta.zip', 'language:qaa', 'articles'],
      ['qaa_tn.zip', 'language:qaa', 'notes'],
      ['qaa_tq.zip', 'language:qaa', 'questions'],
      ['qaa_tw.zip', 'language:qaa', 'articles'],
      ['qaa_twl.zip', 'language:qaa', 'wordLinks'],
      ['qaa_ult.zip', 'language:qaa', 'text'],
      ['qaa_ust.zip', 'language:qaa', 'text'],
      ['obs_images.zip', 'image:obs', 'images'],
    ]);
    const read = parseLock(await lockText(lock));
    expect(read.ok && read.lock).toEqual(lock);
  });

  it('refuses a lock that would ship nothing, or anything it cannot pin to a Door43 release', async () => {
    const lock = await qaaLock();
    const [first] = lock.archives;
    expect(first).toBeDefined();
    const withFirst = (change: Record<string, unknown>) =>
      JSON.stringify({ ...lock, archives: [{ ...first, ...change }] });
    expect(parseLock('not json')).toEqual({ ok: false, reason: 'the lock file is not JSON' });
    expect(parseLock(JSON.stringify({ ...lock, archives: [] }))).toMatchObject({ ok: false });
    expect(parseLock(withFirst({ url: 'https://example.com/qaa_obs.zip' }))).toMatchObject({ ok: false });
    expect(parseLock(withFirst({ sha256: 'abc' }))).toMatchObject({ ok: false });
    expect(parseLock(withFirst({ file: 'qaa-obs.zip' }))).toMatchObject({ ok: false });
    expect(parseLock(withFirst({ pack: 'image:obs' }))).toMatchObject({ ok: false });
    expect(readCarriedLock(join(scratch(), 'missing.json'))).toMatch(/missing/);
  });

  it('pins the committed English lock, and the platform module is generated from it', async () => {
    const read = parseLock(readFileSync(lockPath, 'utf8'));
    expect(read.ok).toBe(true);
    if (!read.ok) {
      return;
    }
    expect(read.lock.language).toBe('en');
    expect(read.lock.archives.some((archive) => archive.resource === 'en_ult')).toBe(true);
    expect(read.lock.archives.some((archive) => archive.row === 'images')).toBe(true);
    expect(readFileSync(platformModulePath, 'utf8')).toBe(await platformModule(read.lock));
  });
});

describe('bundled:fetch', () => {
  it('writes exactly the locked archives, verified, placeable offline, and keeps them on a second run', async () => {
    const lock = await qaaLock();
    const directory = scratch();
    writeFileSync(join(directory, 'stale.zip'), 'left from an older lock');
    const first = await fetchBundled(lock, served(createWorld()), directory);
    expect(first.written).toHaveLength(lock.archives.length);
    expect(first.removed).toEqual(['stale.zip']);
    for (const archive of lock.archives) {
      expect(sha256Of(readFileSync(join(directory, archive.file)))).toBe(archive.sha256);
    }
    const second = await fetchBundled(lock, served(createWorld()), directory);
    expect(second.kept).toHaveLength(lock.archives.length);
    expect(second.written).toEqual([]);
  });

  it('fails loudly on an archive that is not the one the lock pins', async () => {
    const lock = await qaaLock();
    const honest = served(createWorld());
    const tampered: ReadUrl = async (url) => {
      const bytes = await honest(url);
      if (url.includes('qaa_tn')) {
        bytes[bytes.length - 1] = (bytes[bytes.length - 1] ?? 0) ^ 1;
      }
      return bytes;
    };
    await expect(fetchBundled(lock, tampered, scratch())).rejects.toBeInstanceOf(BundledUnverified);
  });
});

describe('npm run bundle with carried content', () => {
  it('stands in only for archives not fetched, and removes only its stand-ins', async () => {
    const lock = await qaaLock();
    const directory = scratch();
    const [kept] = lock.archives;
    writeFileSync(join(directory, kept?.file ?? ''), 'fetched');
    const standIns = placeStandIns(lock, directory);
    expect(standIns.placed).toHaveLength(lock.archives.length - 1);
    standIns.remove();
    expect(existsSync(join(directory, kept?.file ?? ''))).toBe(true);
    expect(lock.archives.filter((archive) => existsSync(join(directory, archive.file)))).toHaveLength(1);
  });

  it('gives every stand-in its own bytes, since Metro keeps one asset per content hash', async () => {
    const lock = await qaaLock();
    const directory = join(scratch(), 'bundled');
    const standIns = placeStandIns(lock, directory);
    const hashes = new Set(standIns.placed.map((file) => sha256Of(readFileSync(join(directory, file)))));
    expect(hashes.size).toBe(lock.archives.length);
    standIns.remove();
    expect(existsSync(directory)).toBe(false);
  });

  it('counts the zip assets an export carries per platform', () => {
    const metadata = {
      fileMetadata: { android: { assets: [{ ext: 'zip' }, { ext: 'png' }, { ext: 'zip' }] }, ios: {} },
    };
    expect(carriedAssetCount(metadata, 'android')).toBe(2);
    expect(carriedAssetCount(metadata, 'ios')).toBe(0);
  });
});
