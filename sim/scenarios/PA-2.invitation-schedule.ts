import assert from 'node:assert/strict';
import { stableJson } from '@lib/json';
import type { DeviceLocale } from '@lib/ports';
import type { World } from '../world';
import { replayJournal } from '../replay';
import { scenario } from '../scenario';

const day = 24 * 60 * 60 * 1000;

async function deviceOnDay(world: World, name: string, locale: Partial<DeviceLocale>, days: number) {
  const phone = world.device(name, { locale });
  await phone.start();
  for (let opened = 1; opened < days; opened += 1) {
    world.clock.advanceDays(1);
    await phone.restart();
  }
  return phone;
}

export default scenario(
  'PA-2',
  'the invitation shows only in the United States, first on the fifth distinct day of use (counted on a warm resume too), dismissible, again every three months, never without a story',
  async (world) => {
    const kenya = await deviceOnDay(
      world,
      'kenya',
      { tag: 'sw-KE', region: 'KE', timeZone: 'Africa/Nairobi' },
      7,
    );
    assert.deepEqual(kenya.kernel.partners.invitation(world.clock.now()), {
      state: 'not-due',
      reason: 'region',
    });

    const byZone = await deviceOnDay(
      world,
      'zone',
      { tag: 'en', region: undefined, timeZone: 'America/Denver' },
      5,
    );
    assert.equal(
      byZone.kernel.partners.invitation(world.clock.now()).state,
      'due',
      'a US time zone is enough',
    );

    const phone = world.device('phone', { locale: { tag: 'en-US', region: 'US', timeZone: 'UTC' } });
    await phone.start();
    await phone.restart();
    await phone.restart();
    const partners = () => phone.kernel.partners;
    assert.equal(partners().daysOfUse(), 1, 'three opens on one day are one day of use');
    for (let opened = 2; opened <= 4; opened += 1) {
      world.clock.advanceDays(1);
      await phone.restart();
      assert.deepEqual(partners().invitation(world.clock.now()), { state: 'not-due', reason: 'days' });
    }
    world.clock.advanceDays(1);
    await phone.restart();
    assert.equal(partners().daysOfUse(), 5);
    const due = partners().invitation(world.clock.now());
    assert.equal(due.state, 'due', 'first shown on the fifth distinct day');
    assert.ok(
      due.state === 'due' &&
        due.story.title.length > 0 &&
        due.story.link.startsWith('https://unfoldingword.org/'),
    );

    await partners().shown(world.clock.now());
    await partners().dismiss();
    world.clock.advance(89 * day);
    await phone.restart();
    assert.deepEqual(partners().invitation(world.clock.now()), { state: 'not-due', reason: 'dismissed' });
    world.clock.advance(day);
    await phone.restart();
    const again = partners().invitation(world.clock.now());
    assert.equal(again.state, 'due', 'shown again three months after it was dismissed');
    assert.equal(again.state === 'due' && again.shown, false, 'a new cycle');
    await partners().shown(world.clock.now());
    assert.equal(phone.kernel.journal.read().filter((entry) => entry.type === 'InvitationShown').length, 2);

    phone.adapters.http.setOnline(false);
    assert.equal((await partners().refresh()).ok, false);
    assert.ok(
      partners().stories().length > 0,
      'a failed refresh never leaves the invitation without a story',
    );
    assert.equal(partners().invitation(world.clock.now()).state, 'due');
    assert.equal(
      JSON.stringify(phone.kernel.snapshot()).includes('US'),
      false,
      'the region never enters the snapshot',
    );

    const kept = world.device('kept', { locale: { tag: 'en-US', region: 'US', timeZone: 'UTC' } });
    await kept.start();
    assert.equal(await kept.kernel.resume(), false, 'a resume on the day the app opened is not a new day');
    for (let opened = 2; opened <= 5; opened += 1) {
      world.clock.advanceDays(1);
      assert.equal(await kept.kernel.resume(), true, 'the first resume on a new day counts it');
      assert.equal(await kept.kernel.resume(), false, 'a second resume that day does not');
    }
    assert.equal(
      kept.kernel.partners.daysOfUse(),
      5,
      'a phone kept open across five days has five days of use',
    );
    assert.equal(
      kept.kernel.partners.invitation(world.clock.now()).state,
      'due',
      'and shows the invitation without ever being restarted',
    );
    const replayed = await replayJournal(
      world,
      JSON.parse(JSON.stringify(kept.kernel.journal.export())) as unknown,
      'kept-replayed',
    );
    assert.ok(replayed.ok, replayed.ok ? '' : replayed.reason);
    assert.deepEqual(replayed.divergence, []);
    assert.equal(
      stableJson(replayed.snapshot),
      stableJson(kept.kernel.snapshot()),
      'a resume replays (DX-3)',
    );
  },
);
