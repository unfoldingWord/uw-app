import assert from 'node:assert/strict';
import { parseJournalExport } from '@lib/journal/export';
import { scenario } from '../scenario';

const limit = 8;
const opens = 12;

export default scenario(
  'DX-1',
  'the journal is bounded and append-only, records failures with a code, and identifies no one',
  async (world) => {
    const device = world.device('phone', {
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
    for (const identifying of ['America/Chicago', '"US"', 'en-US', 'phone']) {
      assert.ok(!exported.includes(identifying), `the journal carries ${identifying}`);
    }
  },
);
