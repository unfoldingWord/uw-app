import assert from 'node:assert/strict';
import { languagePackId } from '@lib/domain/pack';
import { installFromCatalog } from '../install';
import { scenario } from '../scenario';
import { servicesOf } from '../services';

export default scenario(
  'ST-9',
  'with full-text search on, a language installed later is indexed without turning it on again',
  async (world) => {
    const phone = world.device('phone');
    await phone.start();
    await installFromCatalog(phone, [languagePackId('qaa')]);
    const settings = servicesOf(phone).settings;
    assert.equal((await settings.setFullText(true)).built, true);

    await installFromCatalog(phone, [languagePackId('qab')]);
    assert.equal(phone.kernel.corpus.indexWanted('qab'), true, 'the later language is wanted too');
    assert.deepEqual(phone.kernel.corpus.indexState('qab'), { state: 'built' });
    assert.ok(phone.kernel.corpus.index('qab').entries > 0);
    const after = await settings.fullText();
    assert.equal(after.on, true);
    assert.equal(after.built, true);

    await phone.restart();
    assert.equal(phone.kernel.corpus.index('qab').built, true, 'the index survives a restart');

    const fresh = world.device('fresh');
    await fresh.start();
    await installFromCatalog(fresh, [languagePackId('qaa')]);
    await installFromCatalog(fresh, [languagePackId('qab')]);
    assert.equal(fresh.kernel.corpus.indexWanted('qab'), false, 'nothing is built while it is off');
    assert.deepEqual(fresh.kernel.corpus.indexState('qab'), { state: 'off' });
  },
);
