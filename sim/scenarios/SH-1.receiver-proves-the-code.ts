import assert from 'node:assert/strict';
import { languagePackId } from '@lib/domain/pack';
import type { JournalEntry } from '@lib/journal/entry';
import { fromPeer } from '@lib/packs/source';
import { installFromCatalog } from '../install';
import { scenario } from '../scenario';
import { servicesOf } from '../services';
import { startOffer } from '../transfer';

function declinedFailures(entries: readonly JournalEntry[]): number {
  return entries.filter(
    (entry) =>
      entry.type === 'Failure' &&
      entry.payload.code === 'transfer.declined' &&
      entry.payload.context.step === 'transfer',
  ).length;
}

export default scenario(
  'SH-1',
  'the receiver proves the code in its hello, a wrong code is declined without ending the offer, and a typed address reaches the sender',
  async (world) => {
    const leader = world.device('leader', { platform: 'ios' });
    await leader.start();
    await installFromCatalog(leader, [languagePackId('qaa')]);
    const stranger = world.device('stranger', { platform: 'android' });
    const friend = world.device('friend', { platform: 'android' });
    for (const device of [stranger, friend]) {
      await device.start();
    }
    for (const device of [leader, stranger, friend]) {
      device.adapters.http.setOnline(false);
    }

    const offered = await startOffer(leader, { language: 'qaa' });
    assert.match(offered.code, /^\d{4}$/);
    assert.equal(typeof offered.address, 'string', 'the sender has an address to type or scan');
    const sending = leader.kernel.transfer.run(offered.transfer);
    const [peer] = await stranger.kernel.transfer.discover();
    assert.ok(peer);
    const wrong = peer.code === '0000' ? '0001' : '0000';
    const refused = await stranger.kernel.transfer.connect({ ...peer, code: wrong });
    assert.equal(!refused.ok && refused.code, 'transfer.declined', 'a wrong code is declined');
    assert.equal(stranger.kernel.transfer.current(), undefined);
    assert.equal(declinedFailures(leader.kernel.journal.read()), 1, 'the sender journals who it refused');
    assert.equal(leader.kernel.transfer.current()?.state, 'advertising', 'the offer stays open');

    const typed = await friend.kernel.transfer.connectAt(offered.address ?? '', offered.code);
    assert.ok(typed.ok, typed.ok ? '' : typed.code);
    assert.equal(typed.platform, 'ios');
    const accepted = await friend.kernel.transfer.accept();
    assert.ok(accepted.ok && accepted.session, accepted.ok ? '' : accepted.code);
    const sent = await sending;
    assert.ok(sent.ok, sent.ok ? '' : sent.code);
    const installed = await friend.kernel.packs.install(fromPeer(accepted.session));
    assert.ok(installed.ok && installed.pack.source === 'peer');

    const blank = await friend.kernel.transfer.connectAt('', offered.code);
    assert.equal(!blank.ok && blank.code, 'transfer.peer-lost', 'an address nobody listens on is lost');

    const second = await servicesOf(leader).transfer.offer({ language: 'qaa' });
    assert.ok(second.ok);
    assert.ok(second.fallback !== undefined && second.fallback.label.includes(second.fallback.address));
    assert.ok(second.fallback.qr.length > 20);
    const mistyped = await servicesOf(stranger).transfer.connectTyped('nowhere', '12');
    assert.ok(!mistyped.ok && mistyped.message.startsWith('Type the address'), 'a mistyped entry says how');
    const pending = servicesOf(leader).transfer.send(second);
    const shown = await servicesOf(stranger).transfer.connectTyped(second.fallback.address, second.code);
    assert.ok(shown.ok, 'the typed fallback connects through the service');
    await servicesOf(stranger).transfer.decline();
    const declined = await pending;
    assert.equal(!declined.ok && declined.code, 'transfer.declined');
  },
);
