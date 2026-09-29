import assert from 'node:assert/strict';
import { stableJson } from '@lib/json';
import { scenario } from '../scenario';
import { replayJournal } from '../replay';
import { servicesOf } from '../services';

export default scenario(
  'ST-10',
  'any passage, article or story can be bookmarked in Study, appears on Home, and replays from the journal',
  async (world) => {
    const phone = world.device('phone');
    await phone.start();
    const services = servicesOf(phone);
    await services.onboarding.refresh();
    assert.ok((await (await services.onboarding.choose('qaa')).done).ok);

    const opened = await services.study.passage('RUT 1:1');
    assert.equal(opened.state, 'passage');
    assert.equal(opened.state === 'passage' && opened.view.saved, undefined);
    const passage = { target: 'passage', reference: 'RUT 1:1', language: 'qaa' } as const;
    const saved = await services.study.save(passage);
    assert.ok(saved !== undefined);
    assert.equal(
      await services.study.save(passage).then((again) => again?.id),
      saved.id,
      'saving twice keeps one',
    );
    const reopened = await services.study.passage('RUT 1:1');
    assert.equal(reopened.state === 'passage' && reopened.view.saved?.id, saved.id);

    const article = await services.study.article('tw/bible/kt/love');
    assert.equal(article.state, 'article');
    await services.study.save({ target: 'article', article: 'tw/bible/kt/love', language: 'qaa' });
    const story = await services.study.story(3);
    assert.equal(story.state, 'story');
    await services.study.save({ target: 'story', story: 3, language: 'qaa' });
    assert.equal(services.study.saved({ target: 'story', story: 3, language: 'qaa' }) !== undefined, true);

    assert.deepEqual(
      services.home.saved().map((item) => item.kind),
      ['story', 'word', 'passage'],
    );
    assert.equal(await services.study.unsave(saved.id), true);
    assert.deepEqual(
      services.home.saved().map((item) => item.kind),
      ['story', 'word'],
    );

    const exported = JSON.parse(JSON.stringify(phone.kernel.journal.export())) as unknown;
    const replayed = await replayJournal(world, exported, 'replayed');
    assert.ok(replayed.ok, replayed.ok ? '' : replayed.reason);
    assert.deepEqual(replayed.divergence, []);
    assert.equal(stableJson(replayed.snapshot), stableJson(phone.kernel.snapshot()));
    assert.deepEqual(
      servicesOf(replayed.device)
        .home.saved()
        .map((item) => item.kind),
      ['story', 'word'],
    );
  },
);
