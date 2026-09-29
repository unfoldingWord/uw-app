import { describe, expect, it } from 'vitest';
import { composeKernel, coreOwns } from '@lib/compose';
import type { DomainEvent } from '@lib/domain/events';
import { createJournal, defaultJournalLimit } from '@lib/journal/journal';
import { journalFormat, parseJournalExport } from '@lib/journal/export';
import { kernelModules } from '@lib/kernel';
import { stableJson } from '@lib/json';
import { defineModule, ownsNothing, type ModuleContext } from '@lib/module';
import type { Ports } from '@lib/ports';
import { createMemoryClock } from './adapters/clock';
import { createMemoryDb } from './adapters/db';
import { createWorld } from './world';
import { migrations } from './migrations';
import { runMigrations } from '@lib/migrate';
import { mintedIds, replayJournal } from './replay';

function ports(): Ports {
  return createWorld().device('bench').adapters;
}

async function journalOnMemory(limit?: number) {
  const db = createMemoryDb();
  for (const statement of migrations.flatMap((migration) => migration.statements)) {
    await db.exec(statement);
  }
  const clock = createMemoryClock({ at: 1000 });
  const journal = createJournal({ db, clock, ...(limit === undefined ? {} : { limit }) });
  await journal.load();
  return { db, clock, journal };
}

const groups = defineModule<{ create(): Promise<string>; count(): number }>({
  events: ['GroupCreated'],
  owns: { tables: [], directories: [], keys: ['groups'] },
  create(context: ModuleContext) {
    let count = 0;
    const create = async (): Promise<string> => {
      const group = context.ports.ids.next();
      await context.emit({ type: 'GroupCreated', payload: { group } });
      return group;
    };
    return {
      api: { create, count: () => count },
      observe: (entry) => {
        count += entry.type === 'GroupCreated' ? 1 : 0;
      },
      snapshot: () => ({ groups: count }),
      redo: {
        GroupCreated: async () => {
          await create();
        },
      },
    };
  },
});

const trespasser = defineModule<{ pretend(): Promise<unknown> }>({
  events: [],
  owns: ownsNothing,
  create: (context) => ({
    api: { pretend: () => context.emit({ type: 'GroupCreated', payload: { group: 'g-1' } }) },
  }),
});

describe('journal interface (DX-1)', () => {
  it('appends with a clock stamp and a sequence, and reads since a sequence', async () => {
    const { journal, clock } = await journalOnMemory();
    const first = await journal.append({ type: 'InvitationShown', payload: {} });
    clock.advance(5);
    await journal.append((at) => ({
      type: 'AppOpened',
      payload: { day: `2026-01-0${at === 1005 ? 5 : 1}` },
    }));
    expect(first).toMatchObject({ seq: 1, at: 1000, type: 'InvitationShown' });
    expect(journal.read(1).map((entry) => entry.payload)).toEqual([{ day: '2026-01-05' }]);
    expect(journal.stats()).toEqual({
      limit: defaultJournalLimit,
      size: 2,
      dropped: 0,
      lastSeq: 2,
      unpersisted: 0,
    });
  });

  it('refuses an event that breaks its schema and records why', async () => {
    const { journal } = await journalOnMemory();
    const rejected = await journal.append(
      JSON.parse('{"type":"GroupCreated","payload":{"group":"g-1","name":"Grace Fellowship"}}') as never,
    );
    expect(rejected).toBeUndefined();
    const entries = journal.read();
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      type: 'Failure',
      payload: { code: 'journal.event-rejected', context: { type: 'GroupCreated' } },
    });
    expect(JSON.stringify(journal.export())).not.toContain('Grace');
  });

  it('keeps only the newest entries, counts what it dropped, and persists across a reload', async () => {
    const { db, clock, journal } = await journalOnMemory(3);
    for (let index = 0; index < 5; index += 1) {
      await journal.append({ type: 'InvitationShown', payload: {} });
    }
    expect(journal.stats()).toMatchObject({ size: 3, dropped: 2, lastSeq: 5 });
    expect(await db.all('SELECT seq FROM journal ORDER BY seq')).toEqual([
      { seq: 3 },
      { seq: 4 },
      { seq: 5 },
    ]);
    const reloaded = createJournal({ db, clock, limit: 3 });
    await reloaded.load();
    expect(reloaded.stats()).toMatchObject({ size: 3, dropped: 2, lastSeq: 5 });
    expect(stableJson(reloaded.export())).toBe(stableJson(journal.export()));
  });

  it('keeps an entry in memory while the database refuses it, then writes it once it heals', async () => {
    const { db, journal } = await journalOnMemory();
    db.failWrites(true);
    await journal.append({ type: 'InvitationShown', payload: {} });
    await journal.append({ type: 'InvitationTapped', payload: {} });
    expect(journal.read().map((entry) => entry.type)).toEqual([
      'InvitationShown',
      'Failure',
      'InvitationTapped',
    ]);
    expect(journal.stats().unpersisted).toBe(3);
    db.failWrites(false);
    await journal.append({ type: 'InvitationDismissed', payload: {} });
    expect(journal.stats().unpersisted).toBe(0);
    expect(await db.all('SELECT type FROM journal ORDER BY seq')).toHaveLength(4);
  });

  it('exports a versioned document that parses back, and refuses one that does not', async () => {
    const { journal } = await journalOnMemory();
    await journal.append({ type: 'ShareSent', payload: { kind: 'journal' } });
    const document = JSON.parse(JSON.stringify(journal.export())) as unknown;
    const parsed = parseJournalExport(document);
    expect(parsed.ok && parsed.journal.format).toBe(journalFormat);
    expect(
      parseJournalExport({ format: journalFormat, version: 1, limit: 1, dropped: 0, events: [] }).ok,
    ).toBe(false);
    expect(
      parseJournalExport({ format: journalFormat, version: 2, limit: 1, dropped: 0, events: [] }).ok,
    ).toBe(false);
    expect(
      parseJournalExport({
        format: journalFormat,
        version: 2,
        limit: 5,
        dropped: 0,
        baseline: {},
        events: [
          { seq: 2, type: 'InvitationShown', at: 1, payload: {} },
          { seq: 2, type: 'InvitationShown', at: 1, payload: {} },
        ],
      }),
    ).toEqual({ ok: false, reason: 'event 1 has no increasing seq' });
  });
});

describe('kernel composition', () => {
  it('lists its modules in one place, with the tables it owns', () => {
    expect(Object.keys(kernelModules)).toEqual(['telemetry', 'catalog', 'packs']);
    expect(coreOwns.tables).toEqual(['schema_migrations', 'journal', 'journal_state', 'journal_baseline']);
  });

  it('gives every table a migration creates exactly one owner, and every directory one owner', () => {
    const owners = [coreOwns, ...Object.values(kernelModules).map((module) => module.owns)];
    const tables = owners.flatMap((owns) => owns.tables);
    const directories = owners.flatMap((owns) => owns.directories);
    expect(new Set(tables).size).toBe(tables.length);
    expect(new Set(directories).size).toBe(directories.length);
    const created = migrations
      .flatMap((migration) => migration.statements)
      .flatMap((statement) => /^CREATE TABLE (\w+)/.exec(statement)?.[1] ?? []);
    expect(created.filter((table) => !tables.includes(table))).toEqual([]);
    expect(kernelModules.catalog.owns.tables).toEqual(['catalog_releases']);
    expect(kernelModules.packs.owns).toEqual({
      tables: ['packs', 'pack_burritos'],
      directories: ['packs'],
      keys: [],
    });
  });

  it('runs migrations once, opens the app, and snapshots deterministically', async () => {
    const devicePorts = ports();
    const kernel = composeKernel(devicePorts, kernelModules, { migrations });
    await kernel.start();
    await kernel.start();
    expect(kernel.journal.read().map((entry) => entry.type)).toEqual(['AppOpened']);
    const again = composeKernel(devicePorts, kernelModules, { migrations });
    await again.start();
    expect(again.journal.stats().lastSeq).toBe(2);
    expect(stableJson(again.snapshot())).toBe(JSON.stringify(again.snapshot()));
    expect(again.snapshot().modules.telemetry).toMatchObject({ counts: { appOpens: 2 } });
  });

  it('applies migrations once each, in code-point order of their ids, whatever the host locale', async () => {
    const db = createMemoryDb();
    const outcome = await runMigrations(db, [
      { id: '0100-corpus', statements: ['CREATE TABLE c (x)'] },
      { id: '0002-catalog', statements: ['CREATE TABLE b (x)'] },
      { id: '0001-journal', statements: ['CREATE TABLE a (x)'] },
      { id: '0002-Catalog', statements: ['CREATE TABLE d (x)'] },
    ]);
    expect(outcome).toEqual({
      ok: true,
      applied: ['0001-journal', '0002-Catalog', '0002-catalog', '0100-corpus'],
    });
    expect(await runMigrations(db, [{ id: '0001-journal', statements: ['CREATE TABLE a (x)'] }])).toEqual({
      ok: true,
      applied: [],
    });
  });

  it('records a failed migration as a Failure with its id', async () => {
    const kernel = composeKernel(ports(), kernelModules, {
      migrations: [...migrations, { id: '9999-broken', statements: ['CREATE TABLE journal (x)'] }],
    });
    await kernel.start();
    const failure = kernel.journal.read().find((entry) => entry.type === 'Failure');
    expect(failure?.payload).toEqual({ code: 'db.migration-failed', context: { migration: '9999-broken' } });
  });

  it('lets a module emit only the events it owns, and lets modules observe every event', async () => {
    const kernel = composeKernel(ports(), { groups, trespasser }, { migrations });
    await kernel.start();
    expect(await kernel.groups.create()).toBe('id-000001');
    expect(kernel.groups.count()).toBe(1);
    await expect(kernel.trespasser.pretend()).rejects.toThrow('trespasser emitted GroupCreated');
    expect(() => composeKernel(ports(), { groups, twin: groups }, { migrations })).toThrow(
      'both emit GroupCreated',
    );
    expect(() => composeKernel(ports(), { journal: groups }, { migrations })).toThrow('reserved');
  });

  it('redoes intents, re-appends observations and skips consequences', async () => {
    const kernel = composeKernel(ports(), { groups }, { migrations });
    await kernel.start();
    const recorded: DomainEvent[] = [
      { type: 'GroupCreated', at: 1, payload: { group: 'g-9' } },
      { type: 'Failure', at: 2, payload: { code: 'unexpected', context: {} } },
      { type: 'AppOpened', at: 3, payload: { day: '2026-01-05' } },
      { type: 'StoryOpened', at: 4, payload: { story: 1, language: 'qaa' } },
    ];
    const outcomes = [];
    for (const event of recorded) {
      outcomes.push(await kernel.redo(event));
    }
    expect(outcomes).toEqual(['redone', 'skipped', 'restart', 'unhandled']);
    expect(kernel.groups.count()).toBe(1);
  });
});

describe('replay (DX-3)', () => {
  it('collects minted ids in the order they first appear', () => {
    expect(
      mintedIds([
        { type: 'GroupCreated', at: 1, payload: { group: 'b' } },
        {
          type: 'SessionStarted',
          at: 2,
          payload: { group: 'b', track: 'foundations', session: 1, language: 'qaa' },
        },
        { type: 'BookmarkAdded', at: 3, payload: { bookmark: 'a', target: 'story', story: 3 } },
      ]),
    ).toEqual(['b', 'a']);
  });

  it('refuses a document that is not a journal', async () => {
    expect(await replayJournal(createWorld(), { hello: 'world' })).toEqual({
      ok: false,
      reason: 'not a unfoldingword-journal document of version 2',
    });
  });

  it('reports where a rebuilt journal diverges from the recorded one', async () => {
    const result = await replayJournal(createWorld(), {
      format: journalFormat,
      version: 2,
      limit: 10,
      dropped: 0,
      baseline: {},
      events: [
        { seq: 1, type: 'AppOpened', at: 10, payload: { day: '2026-01-05' } },
        { seq: 2, type: 'StoryOpened', at: 20, payload: { story: 4, language: 'qaa' } },
      ],
    });
    expect(result.ok && result.outcomes).toEqual({ restart: 1, unhandled: 1 });
    expect(result.ok && result.divergence).toEqual([
      {
        index: 1,
        recorded: '{"at":20,"payload":{"language":"qaa","story":4},"type":"StoryOpened"}',
        replayed: 'nothing',
      },
    ]);
  });
});
