import assert from 'node:assert/strict';
import { stableJson } from '@lib/json';
import { replayJournal } from '../replay';
import { scenario } from '../scenario';

const hour = 60 * 60 * 1000;

export default scenario(
  'DX-3',
  'an exported journal replays through a fresh device to the same snapshot',
  async (world) => {
    world.clock.setUtcOffsetMinutes(-300);
    const field = world.device('field');
    await field.start();
    for (const gap of [26, 3, 21, 50]) {
      world.clock.advance(gap * hour);
      await field.restart();
    }

    const original = field.kernel.snapshot();
    const shared = JSON.parse(JSON.stringify(field.kernel.journal.export())) as unknown;
    const result = await replayJournal(world, shared, 'replayed');

    assert.ok(result.ok, result.ok ? '' : result.reason);
    assert.deepEqual(result.divergence, []);
    assert.equal(stableJson(result.snapshot), stableJson(original));
    assert.equal(result.device.kernel.telemetry.counts().appOpens, 5);
    assert.deepEqual(result.device.kernel.telemetry.daysOfUse().length, 4);
  },
);
