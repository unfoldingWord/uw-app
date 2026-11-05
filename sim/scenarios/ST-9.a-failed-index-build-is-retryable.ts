import assert from 'node:assert/strict';
import { languagePackId } from '@lib/domain/pack';
import { installFromCatalog } from '../install';
import { scenario } from '../scenario';
import { servicesOf } from '../services';

export default scenario(
  'ST-9',
  'a full-text index that fails to build says so with its failure code, and trying again builds it',
  async (world) => {
    const phone = world.device('phone');
    await phone.start();
    await installFromCatalog(phone, [languagePackId('qaa')]);
    const settings = servicesOf(phone).settings;

    phone.adapters.db.failWrites(/\bcorpus_fulltext/);
    const refused = await settings.setFullText(true);
    phone.adapters.db.failWrites(false);
    assert.deepEqual(phone.kernel.corpus.indexState('qaa'), { state: 'failed', code: 'db.io' });
    assert.equal(refused.built, false);
    assert.deepEqual(
      refused.languages.map((item) => [item.language, item.state]),
      [['qaa', { state: 'failed', code: 'db.io' }]],
      'Settings shows the failed build and its code',
    );
    assert.ok(
      phone.kernel.journal
        .read()
        .some(
          (entry) =>
            entry.type === 'Failure' &&
            entry.payload.code === 'db.io' &&
            entry.payload.context.language === 'qaa',
        ),
    );

    const retried = await settings.retryFullText('qaa');
    assert.deepEqual(phone.kernel.corpus.indexState('qaa'), { state: 'built' });
    assert.equal(retried.built, true, 'trying again builds the index');
    assert.deepEqual(
      retried.languages.map((item) => [item.language, item.state]),
      [['qaa', { state: 'built' }]],
    );
    assert.ok((await phone.kernel.corpus.fullText('famine', 'qaa')).length > 0);
  },
);
