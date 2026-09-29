import assert from 'node:assert/strict';
import { languagePackId } from '@lib/domain/pack';
import { scenario } from '../scenario';

export default scenario(
  'HO-8',
  'what is new lists a downloaded resource once the catalog shows a newer production release',
  async (world) => {
    const phone = world.device('phone');
    await phone.start();
    await phone.kernel.catalog.refresh();
    assert.ok((await phone.kernel.packs.installFromCatalog(languagePackId('qaa'))).ok);
    assert.deepEqual((await phone.kernel.packs.status('qaa')).updates, []);

    world.fixtures.publish('unfoldingWord', 'qaa_tw', 'v2');
    world.fixtures.publish('unfoldingWord', 'qaa_ult', 'v1.1');
    world.fixtures.publish('unfoldingWord', 'qab_obs', 'v2');
    await phone.kernel.catalog.refresh();

    const status = await phone.kernel.packs.status('qaa');
    assert.deepEqual(
      status.updates.map((item) => [item.resource, item.installed, item.available.tag]),
      [
        ['qaa_tw', 'v1', 'v2'],
        ['qaa_ult', 'v1', 'v1.1'],
      ].sort(),
    );
    assert.deepEqual(
      (await phone.kernel.packs.updates()).map((item) => item.pack),
      [languagePackId('qaa')],
      'a release in a language not downloaded is not new to this leader',
    );
    assert.equal(status.complete, true, 'what is new is not what is missing');
  },
);
