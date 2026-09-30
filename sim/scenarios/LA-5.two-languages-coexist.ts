import assert from 'node:assert/strict';
import { languagePackId } from '@lib/domain/pack';
import { burritoRootOf } from '../install';
import { scenario } from '../scenario';

export default scenario(
  'LA-5',
  'several language packs are installed side by side and each stays whole',
  async (world) => {
    const phone = world.device('phone');
    await phone.start();
    await phone.kernel.catalog.refresh();
    for (const language of ['qaa', 'qab', 'en']) {
      assert.ok((await phone.kernel.packs.installFromCatalog(languagePackId(language))).ok);
    }
    assert.deepEqual(
      phone.kernel.packs.installed().map((pack) => [pack.pack, pack.burritos.length]),
      [
        ['language:en', 1],
        ['language:qaa', 11],
        ['language:qab', 2],
      ],
    );
    assert.deepEqual(
      phone.kernel.catalog.languages().map((item) => item.installed),
      [true, true, true],
    );

    await phone.restart();
    assert.equal(phone.kernel.packs.installed().length, 3, 'installed packs survive a restart');
    assert.ok((await phone.kernel.packs.remove(languagePackId('qab'))).ok);
    assert.deepEqual(
      phone.kernel.packs.installed().map((pack) => pack.pack),
      ['language:en', 'language:qaa'],
    );
    assert.equal(await phone.adapters.files.exists('packs/language/qab'), false);
    assert.equal(await phone.adapters.files.exists(`${burritoRootOf(phone, 'qaa_obs')}/metadata.json`), true);
    const qaa = await phone.kernel.packs.status('qaa');
    assert.equal(qaa.complete, true, 'removing one language leaves the other whole');
  },
);
