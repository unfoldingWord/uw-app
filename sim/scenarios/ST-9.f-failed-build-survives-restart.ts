import assert from 'node:assert/strict';
import type { IndexState } from '@lib/corpus/types';
import { languagePackId } from '@lib/domain/pack';
import type { SimDevice } from '../device';
import { installFromCatalog } from '../install';
import { scenario } from '../scenario';
import { servicesOf } from '../services';

function settledIndex(device: SimDevice, language: string): Promise<IndexState> {
  const corpus = device.kernel.corpus;
  return new Promise((resolve) => {
    const check = (): void => {
      const current = corpus.indexState(language);
      if (current.state !== 'waiting' && current.state !== 'building') {
        stop();
        resolve(current);
      }
    };
    const stop = corpus.onIndex(check);
    check();
  });
}

export default scenario(
  'ST-9',
  'a wanted index that is not built after a restart is built again, and a build that fails again says so with Try again',
  async (world) => {
    const phone = world.device('phone');
    await phone.start();
    await installFromCatalog(phone, [languagePackId('qaa')]);
    await phone.kernel.preferences.set('study.language', 'qaa');

    phone.adapters.db.failWrites(/\bcorpus_fulltext/);
    await servicesOf(phone).settings.setFullText(true);
    assert.deepEqual(phone.kernel.corpus.indexState('qaa'), { state: 'failed', code: 'db.io' });

    await phone.restart();
    assert.notDeepEqual(
      phone.kernel.corpus.indexState('qaa'),
      { state: 'off' },
      'a wanted index is never off after a restart',
    );
    assert.deepEqual(await settledIndex(phone, 'qaa'), { state: 'failed', code: 'db.io' });
    const { settings, study } = servicesOf(phone);
    const reported = await settings.fullText();
    assert.equal(reported.on, true);
    assert.deepEqual(
      reported.languages.map((item) => [item.language, item.state]),
      [['qaa', { state: 'failed', code: 'db.io' }]],
      'Settings shows the failed build again after the restart',
    );
    assert.deepEqual((await study.fullTextIndex())?.state, { state: 'failed', code: 'db.io' });

    phone.adapters.db.failWrites(false);
    const retried = await settings.retryFullText('qaa');
    assert.equal(retried.built, true, 'Try again builds the index');

    const second = world.device('second');
    await second.start();
    await installFromCatalog(second, [languagePackId('qaa')]);
    second.adapters.db.failWrites(/\bcorpus_fulltext/);
    await servicesOf(second).settings.setFullText(true);
    second.adapters.db.failWrites(false);

    await second.restart();
    assert.deepEqual(await settledIndex(second, 'qaa'), { state: 'built' }, 'the restart builds it');
    assert.ok((await second.kernel.corpus.fullText('famine', 'qaa')).length > 0);
  },
);
