import assert from 'node:assert/strict';
import { languagePackId } from '@lib/domain/pack';
import { installFromCatalog } from '../install';
import { scenario } from '../scenario';
import { servicesOf } from '../services';

export default scenario(
  'ST-9',
  'Search turns full-text search on itself, hears the index finish and then finds words inside the text',
  async (world) => {
    const phone = world.device('phone');
    await phone.start();
    await installFromCatalog(phone, [languagePackId('qaa')]);
    await phone.kernel.preferences.set('study.language', 'qaa');
    const { study } = servicesOf(phone);

    const before = await study.fullTextIndex();
    assert.deepEqual(before?.state, { state: 'off' });
    assert.equal(before?.wanted, false);
    assert.match(before?.detail ?? '', /Fixture A/, 'the storage cost is shown before building');
    assert.deepEqual(await study.fullText('famine'), []);

    const heard: string[] = [];
    const stop = study.onFullText(() => {
      const index = study.indexState();
      if (index !== undefined) {
        heard.push(index.state);
      }
    });
    await study.setFullText(true);
    stop();
    assert.ok(heard.includes('building'), 'Search hears the build in progress');
    assert.equal(heard.at(-1), 'built', 'Search hears the index finish, so it can run the query again');
    const after = await study.fullTextIndex();
    assert.deepEqual(after?.state, { state: 'built' });
    assert.equal(after?.wanted, true);
    assert.ok((await study.fullText('famine')).length > 0);
  },
);
