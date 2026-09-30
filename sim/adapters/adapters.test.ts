import { describe, expect, it } from 'vitest';
import { failureCodeOf } from '@lib/domain/failures';
import { createMemoryAudio } from './audio';
import { createMemoryClock, dayAtOffset, simEpoch } from './clock';
import { createMemoryDb } from './db';
import { createMemoryFiles } from './files';
import { createMemoryHttp, createMemoryNetwork } from './http';
import { createMemoryIds } from './ids';
import { createMemoryKv } from './kv';
import { createMemoryLocale, defaultSimLocale } from './locale';
import { createPlaybackClock, createPlaybackIds } from './playback';
import { createMemoryShareSheet } from './share-sheet';
import { createTransportBus } from './transport';

async function codeOf(work: Promise<unknown>): Promise<string> {
  try {
    await work;
  } catch (error) {
    return failureCodeOf(error);
  }
  return 'resolved';
}

const bytes = (text: string): Uint8Array => new TextEncoder().encode(text);

describe('Clock memory adapter', () => {
  it('is settable and advanceable, with local days at an offset', () => {
    const clock = createMemoryClock();
    expect(clock.now()).toBe(simEpoch);
    clock.advance(1000);
    expect(clock.now()).toBe(simEpoch + 1000);
    clock.set(Date.UTC(2026, 5, 1, 2, 0));
    expect(clock.dayOf(clock.now())).toBe('2026-06-01');
    clock.setUtcOffsetMinutes(-300);
    expect(clock.dayOf(clock.now())).toBe('2026-05-31');
    clock.advanceDays(2);
    expect(clock.dayOf(clock.now())).toBe('2026-06-02');
    expect(dayAtOffset(Date.UTC(2026, 0, 1, 23, 30), 60)).toBe('2026-01-02');
  });
});

describe('Ids memory adapter', () => {
  it('issues sequential ids', () => {
    const ids = createMemoryIds('g');
    expect([ids.next(), ids.next()]).toEqual(['g-000001', 'g-000002']);
    expect(ids.issued()).toEqual(['g-000001', 'g-000002']);
  });
});

describe('Files memory adapter', () => {
  it('reads, writes, lists and sizes under the device root', async () => {
    const files = createMemoryFiles();
    await files.mkdir('packs/qaa');
    await files.writeText('packs/qaa/metadata.json', '{}');
    await files.writeBytes('packs/qaa/a.bin', new Uint8Array(10));
    expect(await files.readText('packs/qaa/metadata.json')).toBe('{}');
    expect(await files.list('packs')).toEqual([{ name: 'qaa', kind: 'directory', bytes: 0 }]);
    expect((await files.list('packs/qaa')).map((entry) => entry.name)).toEqual(['a.bin', 'metadata.json']);
    expect(await files.size('packs')).toBe(12);
    expect(await files.exists('packs/qaa/a.bin')).toBe(true);
    expect(await codeOf(files.readText('packs/qaa/missing'))).toBe('files.not-found');
    expect(await codeOf(files.writeText('nowhere/file', 'x'))).toBe('files.not-found');
    expect(await codeOf(files.readText('../etc/passwd'))).toBe('files.io');
  });

  it('renames a directory to a free name, and refuses to replace one that exists, as a phone does', async () => {
    const files = createMemoryFiles();
    await files.mkdir('packs/qaa');
    await files.writeText('packs/qaa/old.txt', 'old');
    await files.mkdir('packs/qaa.next');
    await files.writeText('packs/qaa.next/new.txt', 'new');
    expect(await codeOf(files.rename('packs/qaa.next', 'packs/qaa'))).toBe('files.io');
    expect(await files.readText('packs/qaa/old.txt')).toBe('old');
    await files.rename('packs/qaa', 'packs/qaa.old');
    await files.rename('packs/qaa.next', 'packs/qaa');
    expect(files.tree()).toEqual([
      'packs/',
      'packs/qaa.old/',
      'packs/qaa.old/old.txt',
      'packs/qaa/',
      'packs/qaa/new.txt',
    ]);
    expect(await codeOf(files.rename('packs', 'packs/qaa/inside'))).toBe('files.io');
    files.failRename('packs/qaa');
    expect(await codeOf(files.rename('packs/qaa.old', 'packs/qaa/again'))).toBe('files.io');
    await files.rename('packs/qaa.old', 'packs/qaa/again');
    expect(await files.readText('packs/qaa/again/old.txt')).toBe('old');
    await files.remove('packs');
    expect(files.tree()).toEqual([]);
  });

  it('simulates free space and refused writes', async () => {
    const files = createMemoryFiles({ capacity: 10 });
    await files.writeBytes('a', new Uint8Array(6));
    expect(await files.freeSpace()).toBe(4);
    expect(await codeOf(files.writeBytes('b', new Uint8Array(5)))).toBe('files.no-space');
    await files.writeBytes('a', new Uint8Array(10));
    expect(await files.freeSpace()).toBe(0);
    files.failWrites(true);
    expect(await codeOf(files.writeText('c', ''))).toBe('files.io');
  });
});

describe('Db memory adapter', () => {
  it('runs SQL, rolls back a failed transaction, and can refuse writes', async () => {
    const db = createMemoryDb();
    await db.exec('CREATE TABLE t (id INTEGER PRIMARY KEY, name TEXT)');
    expect(await db.run('INSERT INTO t (name) VALUES (?)', ['a'])).toEqual({
      changes: 1,
      lastInsertRowId: 1,
    });
    await expect(
      db.transaction(async (transaction) => {
        await transaction.run('INSERT INTO t (name) VALUES (?)', ['b']);
        throw new Error('abort');
      }),
    ).rejects.toThrow('abort');
    expect(await db.all('SELECT name FROM t')).toEqual([{ name: 'a' }]);
    expect(await db.get('SELECT name FROM t WHERE id = ?', [9])).toBeUndefined();
    db.failWrites(true);
    expect(await codeOf(db.run('INSERT INTO t (name) VALUES (?)', ['c']))).toBe('db.io');
    expect(await db.all('SELECT count(*) AS n FROM t')).toEqual([{ n: 1 }]);
    expect(db.tables()).toEqual(['t']);
  });

  it('serializes work so a transaction is never interleaved', async () => {
    const db = createMemoryDb();
    await db.exec('CREATE TABLE t (n INTEGER)');
    await Promise.all([
      db.transaction(async (transaction) => {
        await transaction.run('INSERT INTO t VALUES (1)');
        await transaction.run('INSERT INTO t VALUES (2)');
      }),
      db.run('INSERT INTO t VALUES (3)'),
    ]);
    expect((await db.all('SELECT n FROM t ORDER BY rowid')).map((row) => row.n)).toEqual([1, 2, 3]);
  });
});

describe('Kv memory adapter', () => {
  it('gets, sets, deletes and lists keys', async () => {
    const kv = createMemoryKv();
    await kv.set('theme', 'dark');
    await kv.set('locale', 'fr');
    expect(await kv.get('theme')).toBe('dark');
    expect(await kv.keys()).toEqual(['locale', 'theme']);
    await kv.delete('theme');
    expect(kv.entries()).toEqual({ locale: 'fr' });
    kv.failWrites(true);
    expect(await codeOf(kv.set('x', 'y'))).toBe('kv.io');
  });
});

describe('Http memory adapter', () => {
  it('serves fixture routes, downloads to files and scripts outages', async () => {
    const network = createMemoryNetwork();
    const files = createMemoryFiles();
    const http = createMemoryHttp({ network, files });
    const url = 'https://git.door43.org/unfoldingWord/qaa_ult/sb/v1.zip';
    network.serve(url, { body: 'burrito' });
    const progress: number[] = [];
    const response = await http.request({
      url,
      timeoutMs: 100,
      onProgress: (received) => progress.push(received),
    });
    expect(response.kind === 'response' && new TextDecoder().decode(response.body)).toBe('burrito');
    expect(progress).toEqual([7]);
    expect(await http.download({ url, timeoutMs: 100, to: 'ult.zip' })).toMatchObject({
      status: 200,
      bytes: 7,
    });
    expect(await files.readText('ult.zip')).toBe('burrito');
    expect(await http.request({ url: 'https://git.door43.org/missing', timeoutMs: 1 })).toMatchObject({
      status: 404,
    });
    http.script('https://git.door43.org/', 'timeout');
    http.script('https://git.door43.org/', { status: 503 });
    expect(await http.request({ url, timeoutMs: 1 })).toEqual({ kind: 'timeout' });
    expect(await http.request({ url, timeoutMs: 1 })).toMatchObject({ kind: 'response', status: 503 });
    expect(await http.request({ url, timeoutMs: 1 })).toMatchObject({ status: 200 });
    http.setOnline(false);
    expect(await http.online()).toBe(false);
    expect(await http.request({ url, timeoutMs: 1 })).toEqual({ kind: 'offline' });
    expect(await http.request({ url: 'https://tracker.example/', timeoutMs: 1 })).toEqual({
      kind: 'refused',
      host: 'tracker.example',
    });
    expect(http.requests()).toHaveLength(8);
  });
});

describe('Transport memory adapter', () => {
  it('carries chunks both ways between an advertiser and a connector', async () => {
    const bus = createTransportBus({ maxChunkBytes: 8 });
    const iphone = bus.transport({ platform: 'ios' });
    const android = bus.transport({
      platform: 'android',
      appPackage: { source: 'file:///app.apk', bytes: 3 },
    });
    const advertisement = await iphone.advertise('4821');
    expect(await iphone.discover(10)).toEqual([]);
    const [peer] = await android.discover(10);
    expect(peer).toMatchObject({ code: '4821', platform: 'ios' });
    if (peer === undefined) {
      throw new Error('no peer');
    }
    const accepting = advertisement.accept(10);
    const sender = await android.connect(peer, 10);
    const receiver = await accepting;
    expect(receiver?.peer.platform).toBe('android');
    await sender.send(bytes('hello'));
    expect(await receiver?.receive()).toEqual(bytes('hello'));
    const waiting = sender.receive();
    await receiver?.send(bytes('ok'));
    expect(await waiting).toEqual(bytes('ok'));
    expect(await codeOf(sender.send(new Uint8Array(9)))).toBe('transfer.unsupported');
    await receiver?.close();
    expect(await sender.receive()).toBeUndefined();
    expect(await codeOf(sender.send(bytes('x')))).toBe('transfer.peer-lost');
    expect(await android.appPackage()).toEqual({ source: 'file:///app.apk', bytes: 3 });
    expect(await iphone.appPackage()).toBeUndefined();
    expect(bus.delivered()).toBe(7);
  });

  it('can lose the link mid-transfer, time out a wait, and turn the radios off', async () => {
    const bus = createTransportBus();
    const one = bus.transport({ platform: 'ios' });
    const two = bus.transport({ platform: 'android' });
    const advertisement = await one.advertise('1');
    const [peer] = await two.discover(10);
    if (peer === undefined) {
      throw new Error('no peer');
    }
    const link = await two.connect(peer, 10);
    expect(await advertisement.accept(10)).toBeDefined();
    const pending = link.receive();
    bus.cut();
    expect(await pending).toBeUndefined();
    const waiting = advertisement.accept(10);
    one.expireWaits();
    expect(await waiting).toBeUndefined();
    await advertisement.stop();
    expect(await codeOf(two.connect(peer, 10))).toBe('transfer.peer-lost');
    two.setAvailable(false);
    expect(await codeOf(two.discover(10))).toBe('transfer.unavailable');
  });

  it('lets a scenario see every chunk on the bus and lose the link after a number of bytes', async () => {
    const bus = createTransportBus();
    const one = bus.transport({ platform: 'ios' });
    const two = bus.transport({ platform: 'android' });
    const advertisement = await one.advertise('7');
    const [peer] = await two.discover(10);
    if (peer === undefined) {
      throw new Error('no peer');
    }
    const link = await two.connect(peer, 10);
    const other = await advertisement.accept(10);
    const seen: Uint8Array[] = [];
    const stop = bus.tap((chunk) => seen.push(chunk));
    bus.cutAfter(5);
    await link.send(bytes('abc'));
    expect(await codeOf(link.send(bytes('def')))).toBe('transfer.peer-lost');
    expect(await other?.receive()).toEqual(bytes('abc'));
    expect(await other?.receive()).toBeUndefined();
    expect(seen).toEqual([bytes('abc')]);
    stop();
    expect(bus.delivered()).toBe(3);
  });
});

describe('Audio memory adapter', () => {
  it('plays on a scripted clock', async () => {
    const clock = createMemoryClock();
    const audio = createMemoryAudio({ clock });
    const source = { kind: 'file', path: 'audio/qaa/obs/01.mp3' } as const;
    expect(await codeOf(audio.load(source))).toBe('audio.unavailable');
    audio.provide(source, 10_000);
    expect(await audio.load(source)).toEqual({ state: 'ready', positionMs: 0, durationMs: 10_000 });
    await audio.play();
    clock.advance(4000);
    expect(audio.status()).toMatchObject({ state: 'playing', positionMs: 4000 });
    await audio.pause();
    clock.advance(4000);
    expect(audio.status()).toMatchObject({ state: 'paused', positionMs: 4000 });
    await audio.seek(9000);
    await audio.play();
    clock.advance(5000);
    expect(audio.status()).toEqual({ state: 'ended', positionMs: 10_000, durationMs: 10_000 });
    await audio.unload();
    expect(audio.status().state).toBe('idle');
  });
});

describe('ShareSheet memory adapter', () => {
  it('records every payload and the outcome', async () => {
    const sheet = createMemoryShareSheet();
    expect(await sheet.share({ title: 'JHN 3:16', text: 'For God so loved', provenance: [] })).toBe('shared');
    sheet.respondWith('dismissed');
    expect(await sheet.share({ title: 't', text: 'x', provenance: [] })).toBe('dismissed');
    expect(sheet.shared().map((payload) => payload.title)).toEqual(['JHN 3:16', 't']);
  });
});

describe('Locale memory adapter', () => {
  it('is settable', () => {
    const locale = createMemoryLocale();
    expect(locale.current()).toEqual(defaultSimLocale);
    locale.set({ tag: 'ar', rtl: true });
    expect(locale.current()).toMatchObject({ tag: 'ar', rtl: true, timeZone: 'UTC' });
  });
});

describe('playback adapters for replay', () => {
  it('play back recorded times, days and ids, then fall back', () => {
    const fallback = createMemoryClock({ at: 5 });
    const clock = createPlaybackClock(
      [
        { type: 'AppOpened', at: 100, payload: { day: '2026-02-01' } },
        { type: 'GroupCreated', at: 200, payload: { group: 'uuid-a' } },
      ],
      fallback,
    );
    expect([clock.now(), clock.remaining(), clock.now(), clock.now()]).toEqual([100, 1, 200, 200]);
    expect(clock.dayOf(100)).toBe('2026-02-01');
    expect(clock.dayOf(0)).toBe('1970-01-01');
    const ids = createPlaybackIds(['uuid-a'], createMemoryIds('late'));
    expect([ids.next(), ids.next()]).toEqual(['uuid-a', 'late-000001']);
  });
});
