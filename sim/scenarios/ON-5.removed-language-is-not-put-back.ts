import assert from 'node:assert/strict';
import { imagePackId, languagePackId } from '@lib/domain/pack';
import { fixtureBundle } from '../bundled';
import { scenario } from '../scenario';

const pack = languagePackId('qaa');

export default scenario(
  'ON-5',
  'a language the leader removed is not put back from what the app carries, on this start or the next',
  async (world) => {
    const bundled = await fixtureBundle('qaa');
    const phone = world.device('phone', { bundled });
    await phone.start();
    assert.ok((await phone.kernel.packs.placeBundled()).every((outcome) => outcome.ok));
    assert.ok((await phone.kernel.packs.remove(pack)).ok);

    assert.deepEqual(await phone.kernel.packs.placeBundled(), [], 'not on this start');
    await phone.restart();
    assert.deepEqual(await phone.kernel.packs.placeBundled(), [], 'nor on the next');
    assert.deepEqual(
      phone.kernel.packs.installed().map((item) => item.pack),
      [imagePackId],
      'the pictures the leader kept stay',
    );

    const earlier = world.device('earlier', { bundled });
    await earlier.start();
    await earlier.kernel.catalog.refresh();
    assert.ok(
      (await earlier.kernel.packs.installFromCatalog(pack)).ok,
      'downloaded before the app carried it',
    );
    const placed = await earlier.kernel.packs.placeBundled();
    assert.deepEqual(
      placed.map((outcome) => (outcome.ok ? outcome.pack.pack : outcome.code)),
      [imagePackId],
      'a language already on the phone is left as it is',
    );
    assert.ok((await earlier.kernel.packs.remove(pack)).ok);
    await earlier.restart();
    assert.deepEqual(await earlier.kernel.packs.placeBundled(), [], 'and once removed it stays removed');
  },
);
