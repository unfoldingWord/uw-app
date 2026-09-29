import assert from 'node:assert/strict';
import { scenario } from '../scenario';
import { servicesOf } from '../services';

export default scenario(
  'HO-6',
  'Home lists saved passages, articles and stories, newest first, with what kind each is',
  async (world) => {
    const phone = world.device('phone');
    await phone.start();
    const services = servicesOf(phone);
    await services.onboarding.refresh();
    assert.ok((await (await services.onboarding.choose('qaa')).done).ok);
    assert.deepEqual(services.home.saved(), []);

    assert.ok(await services.study.save({ target: 'passage', reference: 'RUT 1:1', language: 'qaa' }));
    assert.ok(await services.study.save({ target: 'article', article: 'tw/bible/kt/god', language: 'qaa' }));
    assert.ok(
      await services.study.save({ target: 'article', article: 'ta/translate/figs-idiom', language: 'qaa' }),
    );
    assert.ok(await services.study.save({ target: 'story', story: 2, language: 'qaa' }));

    const saved = services.home.saved();
    assert.deepEqual(
      saved.map((item) => [item.kind, item.detail]),
      [
        ['story', 'Open Bible Stories · Fixture A'],
        ['academy', 'Academy · Fixture A'],
        ['word', 'Words · Fixture A'],
        ['passage', 'Bible text · Fixture A'],
      ],
    );
    const [first] = saved;
    assert.ok(first !== undefined);
    assert.equal(await services.home.removeSaved(first.bookmark.id), true);
    assert.equal(services.home.saved().length, 3);
  },
);
