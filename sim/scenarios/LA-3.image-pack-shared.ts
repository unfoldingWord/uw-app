import assert from 'node:assert/strict';
import { imagePackId, languagePackId } from '@lib/domain/pack';
import { burritoRootOf } from '../install';
import { scenario } from '../scenario';

const image = 'ingredients/images/obs-en-01-01.jpg';

export default scenario(
  'LA-3',
  'the story images are one shared pack downloaded once, and a language override ships inside its pack',
  async (world) => {
    const phone = world.device('phone');
    await phone.start();
    await phone.kernel.catalog.refresh();
    for (const pack of [languagePackId('qaa'), languagePackId('qab'), imagePackId]) {
      const outcome = await phone.kernel.packs.installFromCatalog(pack);
      assert.ok(outcome.ok, outcome.ok ? '' : outcome.code);
    }
    const again = await phone.kernel.packs.installFromCatalog(imagePackId);
    assert.ok(again.ok && again.install === undefined, 'a second request downloads nothing');

    const packs = phone.kernel.packs.installed();
    assert.deepEqual(
      packs.map((pack) => [pack.pack, pack.kind]),
      [
        ['image:obs', 'image'],
        ['language:qaa', 'language'],
        ['language:qab', 'language'],
      ],
    );
    const started = phone.kernel.journal.read().filter((entry) => entry.type === 'PackInstallStarted');
    assert.equal(started.filter((entry) => entry.payload.pack === imagePackId).length, 1);

    const files = phone.adapters.files;
    const shared = await files.readBytes(`${burritoRootOf(phone, 'obs-images')}/${image}`);
    const override = await files.readBytes(`${burritoRootOf(phone, 'qaa_obs')}/${image}`);
    assert.notDeepEqual(override, shared, 'qaa overrides one image inside its own stories burrito');
    assert.equal(
      await files.exists(`${burritoRootOf(phone, 'qab_obs')}/${image}`),
      false,
      'qab uses the shared image',
    );
    assert.ok(
      packs
        .filter((pack) => pack.kind === 'language')
        .every((pack) => pack.burritos.every((burrito) => burrito.row !== 'images')),
    );
  },
);
