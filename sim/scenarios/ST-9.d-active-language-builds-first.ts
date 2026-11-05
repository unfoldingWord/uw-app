import assert from 'node:assert/strict';
import { languagePackId } from '@lib/domain/pack';
import { installFromCatalog } from '../install';
import { scenario } from '../scenario';
import { servicesOf } from '../services';

type Heard = { readonly state: string; readonly percent: number; readonly other: string };

export default scenario(
  'ST-9',
  'turning full-text search on builds the language being read first and reports its progress',
  async (world) => {
    const phone = world.device('phone');
    await phone.start();
    await installFromCatalog(phone, [languagePackId('en'), languagePackId('qaa')]);
    await phone.kernel.preferences.set('study.language', 'qaa');
    const { settings } = servicesOf(phone);
    const corpus = phone.kernel.corpus;

    const heard: Heard[] = [];
    const stop = settings.onFullText(() => {
      const qaa = corpus.indexState('qaa');
      heard.push({
        state: qaa.state,
        percent: qaa.state === 'building' ? qaa.percent : -1,
        other: corpus.indexState('en').state,
      });
    });
    await settings.setFullText(true);
    stop();

    const built = phone.kernel.journal
      .read()
      .filter((entry) => entry.type === 'IndexBuilt')
      .map((entry) => entry.payload.language);
    assert.deepEqual(built, ['qaa', 'en'], 'the language being read is built first');
    const building = heard.filter((item) => item.state === 'building');
    assert.ok(building.length > 1, 'progress is reported while it builds');
    assert.ok(
      building.every((item) => item.other === 'waiting'),
      'the other language waits its turn in view',
    );
    const percents = building.map((item) => item.percent);
    assert.deepEqual(
      percents,
      [...percents].sort((left, right) => left - right),
      'progress only moves forward',
    );
    assert.ok(percents.some((percent) => percent > 0 && percent < 100));
    assert.deepEqual(corpus.indexState('qaa'), { state: 'built' });
    assert.deepEqual(corpus.indexState('en'), { state: 'built' });
  },
);
