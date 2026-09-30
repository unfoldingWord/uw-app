import assert from 'node:assert/strict';
import { stableJson } from '@lib/json';
import { replayJournal } from '../replay';
import { scenario } from '../scenario';
import { servicesOf } from '../services';

export default scenario(
  'HO-7',
  'Home carries the partner invitation card when it is due, led by an impact story, and never otherwise',
  async (world) => {
    const phone = world.device('phone', {
      locale: { tag: 'en-US', region: 'US', timeZone: 'America/Chicago' },
    });
    await phone.start();
    for (let day = 1; day < 5; day += 1) {
      world.clock.advanceDays(1);
      await phone.restart();
    }
    const { home } = servicesOf(phone);
    const due = home.invitation(world.clock.now());
    assert.equal(due.state, 'due');
    assert.equal(due.state === 'due' && due.story.title, 'Jeremiah and the Occult King');
    assert.equal(due.state === 'due' && due.give, 'https://unfoldingword.org/Give');
    assert.deepEqual(due.state === 'due' && due.words, {
      overline: 'Impact story',
      body: 'Partners make resources like these free for leaders everywhere, and you can help extend the reach into the unreached.',
      action: 'Partner with unfoldingWord',
      dismiss: 'Not now',
      readMore: 'Read the full story on unfoldingword.org',
      securityNote: 'Names in this story are changed for security.',
      opensBrowser: 'Opens in your browser',
    });

    await home.invitationShown(world.clock.now());
    await home.invitationShown(world.clock.now());
    assert.equal(
      phone.kernel.journal.read().filter((entry) => entry.type === 'InvitationShown').length,
      1,
      'shown is journaled once per cycle',
    );
    await home.tapInvitation();
    assert.equal(phone.kernel.telemetry.counts().invitationTaps, 1);
    assert.deepEqual(
      home.invitation(world.clock.now()),
      { state: 'not-due', reason: 'dismissed' },
      'a tap ends the cycle',
    );

    const exported = JSON.parse(JSON.stringify(phone.kernel.journal.export())) as unknown;
    const replayed = await replayJournal(world, exported, 'replayed');
    assert.ok(replayed.ok, replayed.ok ? '' : replayed.reason);
    assert.deepEqual(replayed.divergence, []);
    assert.equal(stableJson(replayed.snapshot), stableJson(phone.kernel.snapshot()));
  },
);
