import assert from 'node:assert/strict';
import { languagePackId } from '@lib/domain/pack';
import { fixtureBundle } from '../bundled';
import { scenario } from '../scenario';

const pack = languagePackId('qaa');

export default scenario(
  'LA-7',
  'a newer catalog release replaces one the app carried, opt-in, and the carried one is not put back',
  async (world) => {
    const phone = world.device('phone', { bundled: await fixtureBundle('qaa') });
    await phone.start();
    assert.ok((await phone.kernel.packs.placeBundled()).every((outcome) => outcome.ok));

    world.fixtures.publish('unfoldingWord', 'qaa_tn', 'v2');
    await phone.kernel.catalog.refresh();
    const updates = await phone.kernel.packs.updates();
    assert.deepEqual(
      updates.map((update) => [update.pack, update.resources.map((item) => [item.resource, item.installed])]),
      [[pack, [['qaa_tn', 'v1']]]],
      'the update check sees the carried release as installed',
    );
    const updated = await phone.kernel.packs.update(pack);
    assert.ok(updated.ok, updated.ok ? '' : updated.code);
    const burritos = phone.kernel.packs.installed().find((item) => item.pack === pack)?.burritos ?? [];
    const notes = burritos.find((burrito) => burrito.provenance.resource === 'qaa_tn');
    assert.equal(notes?.provenance.tag, 'v2');
    assert.equal(notes?.source, 'catalog');
    assert.ok(
      burritos.filter((burrito) => burrito !== notes).every((burrito) => burrito.source === 'bundled'),
      'the rest of the pack still says it came with the app',
    );

    await phone.restart();
    assert.deepEqual(await phone.kernel.packs.placeBundled(), [], 'the carried release is not put back');
    const after = phone.kernel.packs.installed().find((item) => item.pack === pack)?.burritos ?? [];
    assert.equal(after.find((burrito) => burrito.provenance.resource === 'qaa_tn')?.provenance.tag, 'v2');
  },
);
