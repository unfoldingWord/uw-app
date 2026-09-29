import assert from 'node:assert/strict';
import { languagePackId } from '@lib/domain/pack';
import { installFixturePacks } from '../corpus-fixtures';
import { scenario } from '../scenario';

export default scenario(
  'ST-8',
  'search takes a reference or finds titles across Words, Academy and Stories, and records no query text',
  async (world) => {
    const device = world.device('phone');
    await device.start();
    await installFixturePacks(device, [languagePackId('qaa')]);
    const corpus = device.kernel.corpus;

    const byName = await corpus.search('Ruth 1:16', 'qaa');
    assert.deepEqual(byName.reference, { reference: 'RUT 1:16', available: true });
    const byCode = await corpus.search('3jn 1:3', 'qaa');
    assert.deepEqual(byCode.reference, { reference: '3JN 1:3', available: true });
    const elsewhere = await corpus.search('Genesis 50:1', 'qaa');
    assert.deepEqual(elsewhere.reference, { reference: 'GEN 50:1', available: false });

    const beloved = await corpus.search('BELOVED', 'qaa');
    assert.equal(beloved.reference, undefined);
    assert.deepEqual(
      beloved.titles.map((hit) => [hit.kind, hit.title, hit.target]),
      [['word', 'love, beloved', { kind: 'article', id: 'tw/bible/kt/love' }]],
    );
    const metaphor = await corpus.search('metaph', 'qaa');
    assert.deepEqual(
      metaphor.titles.map((hit) => [hit.kind, hit.target]),
      [['academy', { kind: 'article', id: 'ta/translate/figs-metaphor' }]],
    );
    const creation = await corpus.search('creation', 'qaa');
    assert.deepEqual(
      creation.titles.map((hit) => [hit.kind, hit.title, hit.target]),
      [['story', 'The Creation', { kind: 'story', story: 1 }]],
    );
    const ruth = await corpus.search('ruth', 'qaa');
    assert.deepEqual(
      ruth.titles.map((hit) => hit.target),
      [{ kind: 'article', id: 'tw/bible/names/ruth' }],
    );
    assert.ok(ruth.titles.every((hit) => /CC BY-SA 4\.0/.test(hit.provenance.licence)));
    assert.deepEqual((await corpus.search('   ', 'qaa')).titles, []);
    assert.deepEqual(
      (await corpus.search('love', 'qab')).titles,
      [],
      'titles are searched in the language asked',
    );

    const runs = device.kernel.journal.read().filter((entry) => entry.type === 'SearchRun');
    assert.deepEqual(
      runs.map((entry) => entry.payload),
      [
        { kind: 'reference', language: 'qaa', hits: 1 },
        { kind: 'reference', language: 'qaa', hits: 1 },
        { kind: 'reference', language: 'qaa', hits: 0 },
        { kind: 'title', language: 'qaa', hits: 1 },
        { kind: 'title', language: 'qaa', hits: 1 },
        { kind: 'title', language: 'qaa', hits: 1 },
        { kind: 'title', language: 'qaa', hits: 1 },
        { kind: 'title', language: 'qaa', hits: 0 },
        { kind: 'title', language: 'qab', hits: 0 },
      ],
    );
    const journal = JSON.stringify(device.kernel.journal.export()).toLowerCase();
    for (const query of ['beloved', 'metaph', 'creation', 'genesis']) {
      assert.ok(!journal.includes(query), `the journal carries the query ${query}`);
    }
  },
);
