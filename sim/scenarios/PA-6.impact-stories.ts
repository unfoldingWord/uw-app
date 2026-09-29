import assert from 'node:assert/strict';
import { scenario } from '../scenario';
import { servicesOf } from '../services';

const feedUrl = 'https://unfoldingword.org/app/impact-stories.json';
const imageUrl = 'https://unfoldingword.org/wp-content/uploads/story.jpg';

const feed = {
  stories: [
    {
      slug: 'a-church-reads-together',
      title: 'A church reads together',
      body: ['First paragraph.', 'Second paragraph.'],
      link: 'https://unfoldingword.org/stories/a-church-reads-together/',
      image: imageUrl,
      securityNote: 'Names have been changed.',
    },
    { slug: 'Not A Slug', title: 'Refused', body: 'x', link: 'https://example.com/' },
  ],
};

export default scenario(
  'PA-6',
  'impact stories ship inside the app, refresh from the unfoldingWord feed when online, stay cached offline and count opens',
  async (world) => {
    const phone = world.device('phone');
    await phone.start();
    const partners = () => servicesOf(phone).partners;
    const [shipped] = partners().stories();
    assert.equal(shipped?.slug, 'jeremiah-and-the-occult-king');
    assert.equal(shipped?.title, 'Jeremiah and the Occult King');
    assert.equal(
      shipped?.link,
      'https://unfoldingword.org/africa/when-jeremiah-first-heard-that-his-chadian-church-planting/',
    );
    assert.equal(shipped?.shipped, true);
    assert.equal(
      partners().storyWords(shipped).securityNote,
      'Names in this story are changed for security.',
    );

    world.network.serve(feedUrl, { body: JSON.stringify(feed) });
    world.network.serve(imageUrl, { body: new Uint8Array([1, 2, 3]) });
    assert.deepEqual(await partners().refresh(), { ok: true, stories: 1 });
    assert.deepEqual(
      partners()
        .stories()
        .map((story) => [story.slug, story.image]),
      [
        ['a-church-reads-together', { path: 'partners/images/a-church-reads-together' }],
        ['jeremiah-and-the-occult-king', undefined],
      ],
      'the feed leads, the shipped story stays, and a story from another host is refused',
    );
    assert.equal(
      partners().storyWords(partners().stories()[0]).securityNote,
      'Names have been changed.',
      'the security note from the website is carried verbatim',
    );

    phone.adapters.http.setOnline(false);
    await phone.restart();
    assert.equal(partners().stories().length, 2, 'cached for offline');
    assert.deepEqual(
      await phone.adapters.files.readBytes('partners/images/a-church-reads-together'),
      new Uint8Array([1, 2, 3]),
    );

    const opened = await partners().open('a-church-reads-together');
    assert.equal(opened?.title, 'A church reads together');
    assert.equal(phone.kernel.telemetry.counts().impactStoryOpens, 1);
    assert.equal(phone.kernel.journal.read().at(-1)?.type, 'ImpactStoryOpened');

    const about = servicesOf(phone).about;
    assert.equal(about.story('a-church-reads-together')?.securityNote, 'Names have been changed.');
    const fromAbout = await about.openStory('jeremiah-and-the-occult-king');
    assert.equal(fromAbout?.securityNote, 'Names in this story are changed for security.');
    assert.equal(fromAbout?.readMore, 'Read the full story on unfoldingword.org');
    assert.equal(phone.kernel.telemetry.counts().impactStoryOpens, 2, 'the About screen counts an open too');
    assert.equal(await about.openStory('no-such-story'), undefined);

    phone.adapters.http.setOnline(true);
    world.network.serve(feedUrl, { body: '{"stories": "none"}' });
    assert.deepEqual(await partners().refresh(), { ok: false, code: 'partners.invalid-feed' });
    assert.equal(partners().stories().length, 2, 'an unreadable feed keeps what is cached');
  },
);
