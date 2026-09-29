import assert from 'node:assert/strict';
import { imagePackId, languagePackId, packDirectory } from '@lib/domain/pack';
import { scenario } from '../scenario';

const capacity = 4 * 1024 * 1024;

export default scenario(
  'LA-6',
  'storage shows the size of each pack and the free space, and a pack can be removed',
  async (world) => {
    const phone = world.device('phone', { capacity });
    await phone.start();
    await phone.kernel.catalog.refresh();
    for (const pack of [languagePackId('qaa'), imagePackId]) {
      assert.ok((await phone.kernel.packs.installFromCatalog(pack)).ok);
    }
    const storage = await phone.kernel.packs.storage();
    assert.deepEqual(
      storage.packs.map((pack) => pack.pack),
      [imagePackId, languagePackId('qaa')],
    );
    for (const pack of storage.packs) {
      assert.equal(
        pack.bytes,
        await phone.adapters.files.size(packDirectory(pack.pack)),
        `${pack.pack} size`,
      );
    }
    assert.equal(
      storage.used,
      storage.packs.reduce((sum, pack) => sum + pack.bytes, 0),
    );
    assert.equal(storage.freeSpace, await phone.adapters.files.freeSpace());

    const removed = await phone.kernel.packs.remove(imagePackId);
    assert.deepEqual(removed, { ok: true, pack: imagePackId });
    assert.equal(phone.kernel.journal.read().at(-1)?.type, 'PackRemoved');
    const after = await phone.kernel.packs.storage();
    assert.deepEqual(
      after.packs.map((pack) => pack.pack),
      [languagePackId('qaa')],
    );
    assert.equal(after.freeSpace, storage.freeSpace + (storage.packs[0]?.bytes ?? 0));
    assert.equal(await phone.adapters.files.exists('packs/image/obs'), false);

    const small = world.device('small', { capacity: 20 * 1024 });
    await small.start();
    await small.kernel.catalog.refresh();
    const full = await small.kernel.packs.installFromCatalog(languagePackId('qaa'));
    assert.equal(!full.ok && full.code, 'pack.no-space');
    assert.equal(small.kernel.journal.read().at(-1)?.type, 'PackFailed');
    assert.deepEqual(
      small.adapters.files.tree().filter((path) => path.startsWith('packs/')),
      ['packs/'],
      'a failed install leaves nothing staged',
    );
    assert.deepEqual(small.kernel.packs.installed(), []);
  },
);
