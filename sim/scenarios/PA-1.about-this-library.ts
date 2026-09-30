import assert from 'node:assert/strict';
import { languagePackId } from '@lib/domain/pack';
import { scenario } from '../scenario';
import { servicesOf } from '../services';

export default scenario(
  'PA-1',
  'About this library counts languages, resources per type and publishers from what the app holds, with impact stories and how to partner',
  async (world) => {
    const phone = world.device('phone');
    await phone.start();
    const { about, onboarding } = servicesOf(phone);
    const empty = about.summary();
    assert.deepEqual(
      empty.stats.map((stat) => [stat.value, stat.label]),
      [
        [0, 'languages'],
        [0, 'published releases'],
        [0, 'resource types'],
      ],
      'before the catalog arrives there is nothing to count, and nothing is fetched to fill it',
    );
    assert.ok(empty.stories.length > 0, 'the shipped impact story is there offline');

    await onboarding.refresh();
    await phone.kernel.packs.installFromCatalog(languagePackId('qab'));
    const summary = about.summary();
    assert.deepEqual(
      summary.stats.map((stat) => [stat.value, stat.label]),
      [
        [3, 'languages'],
        [23, 'published releases'],
        [14, 'resource types'],
      ],
    );
    assert.deepEqual(summary.publishers, ['unfoldingWord', 'Door43-Catalog', 'Worldview']);
    assert.equal(
      summary.publishedBy,
      'unfoldingWord and the church organizations it serves with, in 3 languages. Every resource carries the name of the organization that made it, under CC BY-SA 4.0.',
    );
    const stories = summary.byType.find((row) => row.type === 'stories');
    assert.deepEqual(stories, { type: 'stories', title: 'Open Bible Stories', releases: 4, languages: 3 });
    assert.deepEqual(
      summary.stories.map((story) => story.slug),
      ['jeremiah-and-the-occult-king'],
    );
    assert.deepEqual(summary.partner, {
      title: 'Partner',
      body: 'These resources are free because partners make them so. You can help extend the reach into the unreached.',
      link: 'Give at unfoldingword.org',
      url: 'https://unfoldingword.org/Give',
    });
    assert.equal(summary.links.length, 3);
  },
);
