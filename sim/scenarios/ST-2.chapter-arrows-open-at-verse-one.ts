import assert from 'node:assert/strict';
import { scenario } from '../scenario';
import { servicesOf } from '../services';

export default scenario(
  'ST-2',
  'the chapter arrows open the next or the previous chapter at its first verse, wherever the reader was',
  async (world) => {
    const phone = world.device('phone');
    await phone.start();
    const services = servicesOf(phone);
    await services.onboarding.refresh();
    await services.languages.select('qaa');
    assert.ok((await services.home.completeDownload())?.ok);

    const places = (await services.study.books()).flatMap((book) =>
      book.chapters.map((chapter) => `${book.code} ${String(chapter)}`),
    );
    assert.ok(places.length >= 2, 'the fixture carries at least two chapters to move between');

    const deep = await services.study.passage(`${places[0] ?? ''}:16`);
    assert.ok(deep.state === 'passage');
    assert.deepEqual(deep.view.landing, { chapter: 1, verse: 16 }, 'a verse request lands on the verse');

    for (const place of places.slice(0, 2)) {
      const opened = await services.study.passage(place);
      assert.ok(opened.state === 'passage');
      const [first] = opened.view.passage.text.verses;
      assert.ok(first !== undefined);
      assert.deepEqual(
        opened.view.landing,
        { chapter: first.chapter, verse: first.verse },
        `${place} opens at its first verse, not at the verse number the reader left`,
      );
      assert.equal(first.verse, 1);
    }
  },
);
