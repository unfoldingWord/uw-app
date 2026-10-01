import assert from 'node:assert/strict';
import { languagePackId } from '@lib/domain/pack';
import { installFromCatalog } from '../install';
import { scenario } from '../scenario';
import { startOffer } from '../transfer';

export default scenario(
  'SH-1',
  'a receiver without room for the whole offer refuses before the first chunk, and the sender hears why',
  async (world) => {
    const leader = world.device('leader', { platform: 'ios' });
    await leader.start();
    await installFromCatalog(leader, [languagePackId('qaa')]);
    const small = world.device('small', { platform: 'android' });
    await small.start();
    for (const device of [leader, small]) {
      device.adapters.http.setOnline(false);
    }

    const offered = await startOffer(leader, { language: 'qaa' });
    const sending = leader.kernel.transfer.run(offered.transfer);
    const [peer] = await small.kernel.transfer.discover();
    assert.ok(peer);
    const incoming = await small.kernel.transfer.connect(peer);
    assert.ok(incoming.ok, incoming.ok ? '' : incoming.code);
    const free = await small.adapters.files.freeSpace();
    const used = small.adapters.files.used();
    small.adapters.files.setCapacity(used + Math.floor(incoming.offer.bytes / 2));
    assert.ok((await small.adapters.files.freeSpace()) < incoming.offer.bytes);

    const chunks: string[] = [];
    const stop = small.adapters.files.onWrite((operation, path) => {
      if (operation === 'append' && path.startsWith('transfer/')) {
        chunks.push(path);
      }
    });
    const refused = await small.kernel.transfer.accept();
    stop();
    assert.equal(!refused.ok && refused.code, 'pack.no-space', 'the receiver refuses for space');
    assert.deepEqual(chunks, [], 'no chunk was written before the refusal');
    const sent = await sending;
    assert.equal(!sent.ok && sent.code, 'pack.no-space', 'the sender is told why');
    const failed = small.kernel.journal.read().find((entry) => entry.type === 'TransferFailed');
    assert.ok(failed && failed.type === 'TransferFailed' && failed.payload.code === 'pack.no-space');
    assert.deepEqual(
      small.adapters.files.tree().filter((path) => path.startsWith('transfer/incoming/')),
      [],
      'nothing is left in the incoming directory',
    );

    small.adapters.files.setCapacity(used + free);
    const again = await startOffer(leader, { language: 'qaa' });
    const retry = leader.kernel.transfer.run(again.transfer);
    const [found] = await small.kernel.transfer.discover();
    assert.ok(found);
    assert.ok((await small.kernel.transfer.connect(found)).ok);
    const accepted = await small.kernel.transfer.accept();
    assert.ok(accepted.ok, accepted.ok ? '' : accepted.code);
    assert.ok((await retry).ok, 'with room the same offer is received');
  },
);
