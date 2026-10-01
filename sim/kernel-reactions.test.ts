import { describe, expect, it } from 'vitest';
import { createCancellation } from '@lib/cancel';
import { composeKernel } from '@lib/compose';
import type { FailureCode } from '@lib/domain/failures';
import type { JournalEntry } from '@lib/journal/entry';
import { kernelModules } from '@lib/kernel';
import { stableJson } from '@lib/json';
import { defineModule, ownsNothing, type ModuleContext } from '@lib/module';
import { writeTargets } from '@lib/scope';
import { createMemoryIds } from './adapters/ids';
import { migrations } from './migrations';
import { mintedIds, replayJournal } from './replay';
import { createWorld } from './world';

function device() {
  return createWorld().device('bench');
}

function codeOf(error: unknown): FailureCode | undefined {
  return typeof error === 'object' && error !== null && 'code' in error
    ? (error as { code: FailureCode }).code
    : undefined;
}

async function rejection(work: Promise<unknown>): Promise<FailureCode | undefined> {
  try {
    await work;
    return undefined;
  } catch (error) {
    return codeOf(error);
  }
}

const groups = defineModule<{ create(): Promise<string> }>({
  events: ['GroupCreated'],
  owns: { tables: [], directories: [], keys: [] },
  create(context: ModuleContext) {
    return {
      api: {
        create: async () => {
          const group = context.ports.ids.next();
          await context.emit({ type: 'GroupCreated', payload: { group } });
          return group;
        },
      },
    };
  },
});

describe('the journal before start (DX-1 append-only)', () => {
  it('holds an emit made before start until the stored journal is loaded, so no seq is reused', async () => {
    const bench = device();
    const first = composeKernel(bench.adapters, { groups }, { migrations });
    await first.start();
    await first.groups.create();
    const second = composeKernel(bench.adapters, { groups }, { migrations });
    const early = second.groups.create();
    await second.start();
    await early;
    const seqs = second.journal.read().map((entry) => entry.seq);
    expect(seqs).toEqual([...seqs].sort((left, right) => left - right));
    expect(new Set(seqs).size).toBe(seqs.length);
    const stored = await bench.adapters.db.all('SELECT seq, type FROM journal ORDER BY seq');
    expect(stored.map((row) => row.seq)).toEqual(seqs);
    expect(stored.map((row) => row.type)).toEqual(['AppOpened', 'GroupCreated', 'GroupCreated', 'AppOpened']);
  });
});

describe('telemetry over a bounded journal (DX-1, PRD section 9)', () => {
  it('never counts backwards when old events drop, and carries the baseline across a restart and an export', async () => {
    const world = createWorld();
    const field = world.device('field', { journalLimit: 4 });
    await field.start();
    const opens: number[] = [];
    const days: number[] = [];
    for (let index = 0; index < 9; index += 1) {
      world.clock.advanceDays(1);
      await field.restart();
      opens.push(field.kernel.telemetry.counts().appOpens);
      days.push(field.kernel.telemetry.daysOfUse().length);
    }
    expect(opens).toEqual([2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(days).toEqual([2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(field.kernel.journal.stats()).toMatchObject({ size: 4, dropped: 6 });
    const exported = JSON.parse(JSON.stringify(field.kernel.journal.export())) as unknown;
    const rebuilt = await replayJournal(world, exported, 'field-replayed');
    expect(rebuilt.ok && rebuilt.dropped).toBe(6);
    expect(rebuilt.ok && rebuilt.divergence).toEqual([]);
    expect(rebuilt.ok && stableJson(rebuilt.snapshot)).toBe(stableJson(field.kernel.snapshot()));
    expect(rebuilt.ok && rebuilt.device.kernel.telemetry.counts().appOpens).toBe(10);
  });
});

describe('reactions (observe)', () => {
  it('resolves an emit only after every observer, async ones included, has settled', async () => {
    const seen: string[] = [];
    const slow = defineModule<{ seen(): readonly string[] }>({
      events: [],
      owns: ownsNothing,
      create: () => ({
        api: { seen: () => seen },
        observe: async (entry: JournalEntry) => {
          await new Promise((resolve) => setTimeout(resolve, 5));
          seen.push(entry.type);
        },
      }),
    });
    const kernel = composeKernel(device().adapters, { groups, slow }, { migrations });
    await kernel.start();
    await kernel.groups.create();
    expect(kernel.slow.seen()).toEqual(['AppOpened', 'GroupCreated']);
  });

  it('turns an observer error into a Failure with a code, once, and keeps going', async () => {
    const broken = defineModule<{ ok(): boolean }>({
      events: [],
      owns: ownsNothing,
      create: () => ({
        api: { ok: () => true },
        observe: async (entry: JournalEntry) => {
          if (entry.type === 'GroupCreated' || entry.type === 'Failure') {
            throw Object.assign(new Error('files.io: refused'), { code: 'files.io' });
          }
        },
      }),
    });
    const kernel = composeKernel(device().adapters, { groups, broken }, { migrations });
    await kernel.start();
    await kernel.groups.create();
    const failures = kernel.journal.read().filter((entry) => entry.type === 'Failure');
    expect(failures.map((entry) => entry.payload)).toEqual([
      {
        code: 'kernel.observer-failed',
        context: { observer: 'broken', type: 'GroupCreated', cause: 'files.io' },
      },
    ]);
  });

  it('lets an observer emit its own event without waiting on itself', async () => {
    const echo = defineModule<{ ok(): boolean }>({
      events: ['InvitationShown'],
      owns: ownsNothing,
      create: (context) => ({
        api: { ok: () => true },
        observe: async (entry: JournalEntry) => {
          if (entry.type === 'GroupCreated') {
            await context.emit({ type: 'InvitationShown', payload: {} });
          }
        },
      }),
    });
    const kernel = composeKernel(device().adapters, { groups, echo }, { migrations });
    await kernel.start();
    await kernel.groups.create();
    expect(kernel.journal.read().map((entry) => entry.type)).toEqual([
      'AppOpened',
      'GroupCreated',
      'InvitationShown',
    ]);
  });
});

describe('what a module is handed (docs/replay.md rules 4 and 5, AGENTS.md rule 3)', () => {
  it('gives a module a clock that tells the day of a time but never the time', () => {
    let handed: ModuleContext | undefined;
    const probe = defineModule<{ ok(): boolean }>({
      events: [],
      owns: ownsNothing,
      create: (context) => {
        handed = context;
        return { api: { ok: () => true } };
      },
    });
    composeKernel(device().adapters, { probe }, { migrations });
    expect(Object.keys(handed?.ports.clock ?? {})).toEqual(['dayOf']);
  });

  it('refuses a second id before the first appears in an event, and an event that drops the id', async () => {
    const careless = defineModule<{ twice(): Promise<void>; silent(): Promise<unknown> }>({
      events: ['GroupCreated', 'InvitationShown'],
      owns: ownsNothing,
      create: (context) => ({
        api: {
          twice: async () => {
            context.ports.ids.next();
            context.ports.ids.next();
          },
          silent: async () => {
            context.ports.ids.next();
            return context.emit({ type: 'InvitationShown', payload: {} });
          },
        },
      }),
    });
    const bench = device();
    const kernel = composeKernel(bench.adapters, { careless }, { migrations });
    await kernel.start();
    await expect(kernel.careless.twice()).rejects.toThrow('minted a second id');
    const other = composeKernel(
      { ...bench.adapters, ids: createMemoryIds('other') },
      { careless },
      { migrations },
    );
    await other.start();
    await expect(other.careless.silent()).rejects.toThrow('before an event carried the id');
  });

  it('lets a Failure close an id minted for a write that failed, so the next id is free to mint', async () => {
    const refusing = defineModule<{ fail(): Promise<void>; succeed(): Promise<string> }>({
      events: ['GroupCreated'],
      owns: ownsNothing,
      create: (context) => ({
        api: {
          fail: async () => {
            context.ports.ids.next();
            await context.emit({
              type: 'Failure',
              payload: { code: 'db.io', context: { type: 'GroupCreated' } },
            });
          },
          succeed: async () => {
            const group = context.ports.ids.next();
            await context.emit({ type: 'GroupCreated', payload: { group } });
            return group;
          },
        },
      }),
    });
    const kernel = composeKernel(device().adapters, { refusing }, { migrations });
    await kernel.start();
    await kernel.refusing.fail();
    const group = await kernel.refusing.succeed();
    expect(kernel.journal.read().map((entry) => entry.type)).toEqual([
      'AppOpened',
      'Failure',
      'GroupCreated',
    ]);
    expect(mintedIds(kernel.journal.read())).toEqual([group]);
  });

  it('lets a module write only the tables, directories and preference keys it owns', async () => {
    const bench = device();
    let context: ModuleContext | undefined;
    const tenant = defineModule<{ ok(): boolean }>({
      events: [],
      owns: { tables: ['tenant_rows'], directories: ['tenant'], keys: ['tenant'] },
      create: (handed) => {
        context = handed;
        return { api: { ok: () => true } };
      },
    });
    const kernel = composeKernel(bench.adapters, { ...kernelModules, tenant }, { migrations });
    await kernel.start();
    const ports = context?.ports;
    if (ports === undefined) {
      throw new Error('the module was not created');
    }
    await ports.db.exec('CREATE TABLE tenant_rows (id TEXT)');
    await ports.db.run('INSERT INTO tenant_rows (id) VALUES (?)', ['a']);
    expect(await rejection(ports.db.run('DELETE FROM packs'))).toBe('kernel.not-owned');
    expect(await rejection(ports.db.exec('DROP TABLE journal'))).toBe('kernel.not-owned');
    expect(await rejection(ports.db.exec('PRAGMA writable_schema = 1'))).toBe('kernel.not-owned');
    expect(
      await rejection(
        ports.db.transaction((transaction) => transaction.run("UPDATE catalog_releases SET tag = 'x'")),
      ),
    ).toBe('kernel.not-owned');
    expect(await ports.db.all('SELECT pack FROM packs')).toEqual([]);
    await ports.files.mkdir('tenant/cache');
    await ports.files.writeText('tenant/cache/a.txt', 'a');
    expect(await rejection(ports.files.writeText('packs/language/qaa/x.txt', 'x'))).toBe('kernel.not-owned');
    expect(await rejection(ports.files.remove('packs'))).toBe('kernel.not-owned');
    expect(await rejection(ports.files.rename('tenant/cache', 'packs/cache'))).toBe('kernel.not-owned');
    expect(await rejection(ports.files.writeText('tenant/../packs/x', 'x'))).toBe('kernel.not-owned');
    expect(await rejection(ports.files.adopt('file:///x.zip', 'inbox/x.zip'))).toBe('kernel.not-owned');
    expect(
      await rejection(
        ports.http.download({ url: 'https://git.door43.org/x', to: 'packs/x.zip', timeoutMs: 10 }),
      ),
    ).toBe('kernel.not-owned');
    expect(await ports.files.readText('tenant/cache/a.txt')).toBe('a');
    await ports.kv.set('tenant.theme', 'dark');
    expect(await rejection(ports.kv.set('home.name', 'x'))).toBe('kernel.not-owned');
    expect(await rejection(ports.kv.get('home.name'))).toBe('kernel.not-owned');
    await bench.adapters.kv.set('home.name', 'x');
    expect(await ports.kv.keys()).toEqual(['tenant.theme']);
  });

  it('reads the table a statement writes', () => {
    expect(writeTargets('INSERT OR REPLACE INTO a (x) VALUES (1)')).toEqual(['a']);
    expect(
      writeTargets(
        "INSERT INTO journal_state (key, value) VALUES ('d', 1) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
      ),
    ).toEqual(['journal_state']);
    expect(writeTargets('WITH x AS (SELECT 1) DELETE FROM b WHERE id IN x')).toEqual(['b']);
    expect(writeTargets('CREATE VIRTUAL TABLE c USING fts5(body)')).toEqual(['c']);
    expect(writeTargets('CREATE INDEX c_pack ON c (pack)')).toEqual(['c']);
    expect(writeTargets('VACUUM')).toBeUndefined();
  });
});

describe('ports for large files and intake (SH-3)', () => {
  it('reads a range, appends, and adopts a file the system handed to the app', async () => {
    const { files } = device().adapters;
    await files.mkdir('inbox');
    await files.writeBytes('inbox/a.bin', new Uint8Array([1, 2, 3]));
    await files.appendBytes('inbox/a.bin', new Uint8Array([4, 5]));
    expect([...(await files.readRange('inbox/a.bin', 1, 3))]).toEqual([2, 3, 4]);
    expect([...(await files.readRange('inbox/a.bin', 4, 10))]).toEqual([5]);
    files.offerExternal('content://downloads/qab_obs.zip', new Uint8Array([9, 9]));
    expect(await files.adopt('content://downloads/qab_obs.zip', 'inbox/qab_obs.zip')).toBe(2);
    expect([...(await files.readBytes('inbox/qab_obs.zip'))]).toEqual([9, 9]);
    expect(await rejection(files.adopt('content://downloads/other.zip', 'inbox/x.zip'))).toBe(
      'files.not-found',
    );
  });

  it('cancels a held request and resumes a download from an offset', async () => {
    const bench = device();
    const { http, files } = bench.adapters;
    const url = 'https://git.door43.org/unfoldingWord/qaa_ult/sb/v1.zip';
    const release = http.hold(url);
    const cancellation = createCancellation();
    const pending = http.request({ url, timeoutMs: 10, cancel: cancellation.token });
    cancellation.cancel();
    expect(await pending).toEqual({ kind: 'cancelled' });
    release();
    await files.mkdir('dl');
    const whole = await http.request({ url, timeoutMs: 10 });
    const body = whole.kind === 'response' ? whole.body : new Uint8Array();
    await files.writeBytes('dl/a.zip', body.slice(0, 100));
    const resumed = await http.download({ url, to: 'dl/a.zip', timeoutMs: 10, resumeFrom: 100 });
    expect(resumed).toMatchObject({ kind: 'response', status: 206, bytes: body.byteLength - 100 });
    expect(stableJson([...(await files.readBytes('dl/a.zip'))])).toBe(stableJson([...body]));
  });
});
