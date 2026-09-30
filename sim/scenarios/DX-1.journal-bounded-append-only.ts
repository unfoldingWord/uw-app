import assert from 'node:assert/strict';
import { parseJournalExport } from '@lib/journal/export';
import { createJournal } from '@lib/journal/journal';
import { createMemoryClock } from '../adapters/clock';
import { createMemoryDb } from '../adapters/db';
import { migrations } from '../migrations';
import { scenario } from '../scenario';

const limit = 8;
const opens = 12;

export default scenario(
  'DX-1',
  'the journal is bounded and append-only, records failures with a code, and identifies no one',
  async (world) => {
    const device = world.device('kitale-field-device', {
      journalLimit: limit,
      locale: { tag: 'en-US', region: 'US', timeZone: 'America/Chicago', rtl: false },
    });
    await device.start();
    for (let day = 1; day < opens; day += 1) {
      world.clock.advanceDays(1);
      await device.restart();
    }

    const stats = device.kernel.journal.stats();
    assert.equal(stats.limit, limit);
    assert.equal(stats.size, limit);
    assert.equal(stats.lastSeq, opens);
    assert.equal(stats.dropped, opens - limit);

    const entries = device.kernel.journal.read();
    assert.deepEqual(
      entries.map((entry) => entry.seq),
      Array.from({ length: limit }, (_, index) => opens - limit + 1 + index),
    );
    assert.deepEqual(device.kernel.journal.read(opens - 2).length, 2);
    assert.ok(Object.isFrozen(entries));
    assert.ok(entries.every((entry) => Object.isFrozen(entry) && Object.isFrozen(entry.payload)));
    assert.deepEqual(Object.keys(device.kernel.journal).sort(), ['export', 'read', 'stats']);

    device.adapters.db.failWrites(true);
    world.clock.advanceDays(1);
    await device.restart();
    const failure = device.kernel.journal.read().find((entry) => entry.type === 'Failure');
    assert.ok(failure, 'a refused database write is recorded as a Failure event');
    assert.equal(failure.type === 'Failure' && failure.payload.code, 'journal.persist-failed');
    assert.ok(device.kernel.journal.stats().unpersisted > 0);
    assert.ok(
      device.kernel.journal.export().events.some((entry) => entry.type === 'Failure'),
      'the failure can still be shared out while the database refuses writes',
    );

    device.adapters.db.failWrites(false);
    world.clock.advanceDays(1);
    await device.restart();
    const healed = device.kernel.journal.stats();
    assert.equal(healed.unpersisted, 0);
    assert.equal(healed.lastSeq, opens + 1);
    assert.equal(device.kernel.journal.read().at(-1)?.type, 'AppOpened');

    const exported = JSON.stringify(device.kernel.journal.export());
    const parsed = parseJournalExport(JSON.parse(exported));
    assert.ok(parsed.ok, parsed.ok ? '' : parsed.reason);
    for (const identifying of ['America/Chicago', '"US"', 'en-US', 'kitale']) {
      assert.ok(!exported.includes(identifying), `the journal carries ${identifying}`);
    }

    const db = createMemoryDb();
    for (const statement of migrations.flatMap((migration) => migration.statements)) {
      await db.exec(statement);
    }
    const journal = createJournal({ db, clock: createMemoryClock() });
    await journal.load();
    const typed = [
      { type: 'PreferenceChanged', payload: { key: 'home.name', value: 'Jesse' } },
      { type: 'Failure', payload: { code: 'unexpected', context: { leader: 'Jesse.Griffin' } } },
      { type: 'GroupCreated', payload: { group: 'Jesse-Tuesday-Group' } },
    ];
    for (const attempt of typed) {
      assert.equal(await journal.append(JSON.parse(JSON.stringify(attempt)) as never), undefined);
    }
    assert.ok(await journal.append({ type: 'PreferenceChanged', payload: { key: 'home.name' } }));
    const kept = JSON.stringify(journal.export());
    assert.ok(!kept.includes('Jesse'), 'a typed name never enters the journal');
    assert.deepEqual(
      journal.read().map((entry) => entry.type),
      ['Failure', 'Failure', 'Failure', 'PreferenceChanged'],
    );
  },
);
