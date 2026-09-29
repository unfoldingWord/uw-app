import assert from 'node:assert/strict';
import { scenario } from '../scenario';
import { servicesOf } from '../services';

export default scenario(
  'HO-6',
  'Home lists saved passages, articles and stories, newest first, with what kind each is, and each opens where it was saved',
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
    assert.deepEqual(
      saved.map((item) => item.href),
      [
        '/study/story/2',
        '/study/article/ta/translate/figs-idiom',
        '/study/article/tw/bible/kt/god',
        '/study?reference=RUT%201%3A1',
      ],
      'a story, an article and a passage each open their own place in Study',
    );
    const passageHref = saved.at(-1)?.href ?? '';
    const reference = new URL(passageHref, 'https://app.invalid').searchParams.get('reference');
    assert.equal(reference, 'RUT 1:1');
    const opened = await services.study.passage(reference ?? '');
    assert.equal(opened.state === 'passage' && opened.view.reference, 'RUT 1:1');
    const [first] = saved;
    assert.ok(first !== undefined);
    assert.equal(await services.home.removeSaved(first.bookmark.id), true);
    assert.equal(services.home.saved().length, 3);
  },
);
