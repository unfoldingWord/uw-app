import assert from 'node:assert/strict';
import { languagePackId } from '@lib/domain/pack';
import { installFromCatalog } from '../install';
import { scenario } from '../scenario';
import { servicesOf } from '../services';

export default scenario(
  'ST-9',
  'Settings reports each language from its built index, not from the wish, and agrees with Search',
  async (world) => {
    const phone = world.device('phone');
    await phone.start();
    await installFromCatalog(phone, [languagePackId('qaa')]);
    await phone.kernel.preferences.set('study.language', 'qaa');
    const { settings, study } = servicesOf(phone);

    const off = await settings.fullText();
    assert.deepEqual(
      off.languages.map((item) => [item.language, item.state]),
      [['qaa', { state: 'off' }]],
    );

    phone.adapters.db.failWrites(/\bcorpus_fulltext/);
    const wanted = await settings.setFullText(true);
    phone.adapters.db.failWrites(false);
    assert.equal(wanted.on, true, 'the toggle keeps the choice the leader made');
    assert.equal(wanted.built, false);
    assert.notDeepEqual(
      wanted.languages[0]?.state,
      { state: 'built' },
      'a wanted index that is not built is never reported as built',
    );
    const search = await study.fullTextIndex();
    assert.deepEqual(search?.state, wanted.languages[0]?.state, 'Search and Settings agree');

    await settings.retryFullText('qaa');
    const built = await settings.fullText();
    assert.deepEqual(built.languages[0]?.state, { state: 'built' });
    assert.deepEqual((await study.fullTextIndex())?.state, { state: 'built' });
  },
);
