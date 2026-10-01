import assert from 'node:assert/strict';
import { stableJson } from '@lib/json';
import { replayJournal } from '../replay';
import { scenario } from '../scenario';
import { servicesOf } from '../services';

export default scenario(
  'DX-1',
  'a preference write the key-value store refuses is journaled as a Failure, no PreferenceChanged claims it, the old value stays, and the device replays',
  async (world) => {
    const phone = world.device('phone');
    await phone.start();
    const services = servicesOf(phone);
    const types = () => phone.kernel.journal.read().map((entry) => entry.type);
    const changed = () => types().filter((type) => type === 'PreferenceChanged').length;
    const kvFailures = () =>
      phone.kernel.journal
        .read()
        .flatMap((entry) =>
          entry.type === 'Failure' ? [{ code: entry.payload.code, type: entry.payload.context.type }] : [],
        );

    assert.equal(await services.settings.setTheme('dark'), true);
    assert.equal(services.settings.theme(), 'dark');
    const before = changed();

    let heard = 0;
    const stop = phone.kernel.preferences.onChange(() => {
      heard += 1;
    });
    phone.adapters.kv.failWrites(true);
    assert.equal(
      await services.settings.setTheme('light'),
      false,
      'a refused write reports that it did not save',
    );
    assert.equal(await services.settings.setName('Amani'), false);
    assert.equal(await services.settings.setReducedBlur(true), false, 'the Settings toggles report it too');
    assert.equal(await services.settings.setReducedMotion(true), false);
    assert.deepEqual(services.settings.appearance(), { scheme: 'dark' }, 'no toggle claims a change');
    assert.deepEqual(
      await services.home.toggleTheme('light'),
      { ok: false, code: 'kv.io' },
      'the theme toggle on Home carries the code it can show in place',
    );
    assert.equal(changed(), before, 'no PreferenceChanged for a write that failed');
    assert.deepEqual(
      kvFailures(),
      Array.from({ length: 5 }, () => ({ code: 'kv.io', type: 'PreferenceChanged' })),
      'each refused write is a Failure with kv.io and the event it held back',
    );
    assert.equal(services.settings.theme(), 'dark', 'the value in memory is the one on the device');
    assert.equal(services.settings.name(), undefined);
    assert.equal(heard, 0, 'nobody is told a preference changed');
    phone.adapters.kv.failWrites(false);
    stop();

    assert.equal(phone.adapters.kv.entries()['home.theme'], 'dark');
    assert.equal(await services.settings.setTheme('light'), true);
    assert.equal(services.settings.theme(), 'light');
    const order = types().slice(-1);
    assert.deepEqual(order, ['PreferenceChanged'], 'the event follows the write that succeeded');
    assert.equal(phone.adapters.kv.entries()['home.theme'], 'light');

    await phone.restart();
    assert.equal(servicesOf(phone).settings.theme(), 'light', 'what was written survives a restart');

    const replayed = await replayJournal(
      world,
      JSON.parse(JSON.stringify(phone.kernel.journal.export())) as unknown,
      'replayed',
    );
    assert.ok(replayed.ok, replayed.ok ? '' : replayed.reason);
    assert.equal(
      stableJson(replayed.snapshot.modules),
      stableJson(phone.kernel.snapshot().modules),
      'the replayed device holds the same preferences',
    );
  },
);
