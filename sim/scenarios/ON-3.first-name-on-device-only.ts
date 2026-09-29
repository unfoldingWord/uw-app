import assert from 'node:assert/strict';
import { stableJson } from '@lib/json';
import { replayJournal } from '../replay';
import { scenario } from '../scenario';
import { localTime, servicesOf } from '../services';

export default scenario(
  'ON-3',
  'an optional first name is kept only on the device, used only in the Home greeting and never journaled',
  async (world) => {
    const phone = world.device('phone', { locale: { tag: 'en-US' } });
    await phone.start();
    const { onboarding, home } = servicesOf(phone);
    await onboarding.refresh();
    assert.equal(home.greeting(localTime(phone)).text, 'Good morning', 'no name, no name in the greeting');

    const chosen = await onboarding.choose('qab', { name: '  Jesse  ' });
    assert.ok((await chosen.done).ok);
    assert.equal(home.greeting(localTime(phone)).text, 'Good morning, Jesse');
    assert.equal(await phone.adapters.kv.get('home.name'), 'Jesse', 'the name is on the device');

    const leaks = [
      JSON.stringify(phone.kernel.journal.export()),
      JSON.stringify(phone.kernel.snapshot()),
      ...phone.adapters.http.sent().map((request) => JSON.stringify(request)),
    ].filter((text) => text.includes('Jesse'));
    assert.deepEqual(leaks, [], 'the name is in no journal, snapshot or request');
    assert.ok(
      phone.kernel.journal
        .read()
        .some((entry) => entry.type === 'PreferenceChanged' && entry.payload.key === 'home.name'),
      'that a name was set is journaled, without its value',
    );

    await phone.restart();
    assert.equal(servicesOf(phone).home.greeting(localTime(phone)).text, 'Good morning, Jesse');

    const cleared = await servicesOf(phone).settings.setName('');
    assert.equal(cleared, true);
    assert.equal(servicesOf(phone).home.greeting(localTime(phone)).text, 'Good morning');
    assert.equal(await phone.adapters.kv.get('home.name'), undefined);

    await servicesOf(phone).settings.setName('Jesse');
    const exported = JSON.parse(JSON.stringify(phone.kernel.journal.export())) as unknown;
    const replayed = await replayJournal(world, exported, 'replayed');
    assert.ok(replayed.ok, replayed.ok ? '' : replayed.reason);
    assert.deepEqual(replayed.divergence, []);
    assert.equal(stableJson(replayed.snapshot), stableJson(phone.kernel.snapshot()));
    assert.equal(
      await replayed.device.adapters.kv.get('home.name'),
      undefined,
      'the journal cannot carry the name, so the replayed device has none',
    );
  },
);
