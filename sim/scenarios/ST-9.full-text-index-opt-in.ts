import assert from 'node:assert/strict';
import { utf8 } from '@lib/burrito/files';
import { mimeTypes } from '@lib/burrito/flavors';
import { audioPackId, languagePackId } from '@lib/domain/pack';
import { parseReference } from '@lib/domain/reference';
import { importLocalBurrito } from '../burritos';
import { installFromCatalog } from '../install';
import { scenario } from '../scenario';

const chinese = String.raw`\id JHN
\c 3
\v 16 神爱世人，甚至将他的独生子赐给他们，叫一切信他的，不至灭亡，反得永生。
\v 17 因为神差他的儿子降世，不是要定世人的罪。`;

export default scenario(
  'ST-9',
  'full-text search is built on the device only when asked, after its storage cost is shown, and searches downloaded content',
  async (world) => {
    const device = world.device('phone');
    await device.start();
    await installFromCatalog(device, [languagePackId('qaa')]);
    const corpus = device.kernel.corpus;

    assert.deepEqual(corpus.index('qaa'), { built: false, entries: 0, bytes: 0 });
    assert.equal(corpus.indexWanted('qaa'), false);
    assert.deepEqual(await corpus.fullText('famine', 'qaa'), [], 'no full-text hits before the index exists');
    const reads: string[] = [];
    const stopReads = device.adapters.files.onRead((_operation, path) => reads.push(path));
    const cost = await corpus.indexCost('qaa');
    stopReads();
    assert.ok(cost.bytes > 0 && cost.entries > 0, 'the storage cost is known before building');
    assert.deepEqual(reads, [], 'the cost is estimated from sizes the corpus holds, reading nothing');
    assert.ok(
      !device.kernel.journal.read().some((entry) => entry.type === 'IndexStarted'),
      'estimating the cost builds nothing',
    );

    const ruth = parseReference('RUT 1:1');
    assert.ok(ruth.ok);
    const building = corpus.reindex('qaa');
    const reading = corpus.passage(ruth.reference, { language: 'qaa' });
    const [built, passage] = await Promise.all([building, reading]);
    assert.ok(passage, 'a passage opens while the index builds');
    const order = device.kernel.journal
      .read()
      .filter((entry) => ['IndexStarted', 'IndexBuilt', 'PassageOpened'].includes(entry.type))
      .map((entry) => entry.type);
    assert.deepEqual(
      order,
      ['IndexStarted', 'PassageOpened', 'IndexBuilt'],
      'reading never waits for the build',
    );
    assert.equal(built.built, true);
    assert.equal(corpus.indexWanted('qaa'), true);
    assert.ok(built.entries > 0 && cost.entries > 0);
    assert.ok(
      built.bytes > 0 && built.bytes <= cost.bytes,
      `built ${built.bytes} within the estimate ${cost.bytes}`,
    );
    const events = device.kernel.journal
      .read()
      .filter((entry) => entry.type === 'IndexStarted' || entry.type === 'IndexBuilt');
    assert.deepEqual(
      events.map((entry) => [entry.type, entry.payload]),
      [
        ['IndexStarted', { language: 'qaa' }],
        ['IndexBuilt', { language: 'qaa', entries: built.entries, bytes: built.bytes }],
      ],
    );

    const famine = await corpus.fullText('famine', 'qaa');
    const targets = famine.map((hit) => hit.target);
    assert.ok(targets.some((target) => target.kind === 'passage' && target.reference === 'RUT 1:1'));
    assert.ok(targets.some((target) => target.kind === 'article' && target.id === 'tw/bible/other/famine'));
    assert.ok(famine.every((hit) => /CC BY-SA 4\.0/.test(hit.provenance.licence) && hit.snippet.length > 0));
    const garden = await corpus.fullText('Garden', 'qaa');
    assert.ok(garden.some((hit) => hit.target.kind === 'story' && hit.target.story === 1));
    assert.deepEqual(
      await corpus.fullText('"unbalanced OR', 'qaa'),
      [],
      'query syntax never reaches the index',
    );
    assert.deepEqual(
      device.kernel.journal
        .read()
        .filter((entry) => entry.type === 'SearchRun' && entry.payload.kind === 'fulltext')
        .map((entry) => entry.payload),
      [
        { kind: 'fulltext', language: 'qaa', hits: 0 },
        { kind: 'fulltext', language: 'qaa', hits: famine.length },
        { kind: 'fulltext', language: 'qaa', hits: garden.length },
        { kind: 'fulltext', language: 'qaa', hits: 0 },
      ],
    );
    assert.ok(!JSON.stringify(device.kernel.journal.export()).includes('famine'));
    assert.deepEqual((device.kernel.snapshot().modules.corpus as { indexes: unknown }).indexes, {
      qaa: { entries: built.entries, bytes: built.bytes },
    });

    await device.restart();
    assert.deepEqual(device.kernel.corpus.index('qaa'), built, 'the index survives a restart');
    assert.equal((await device.kernel.corpus.fullText('famine', 'qaa')).length, famine.length);

    const beforeAudio = device.kernel.journal.stats().lastSeq;
    assert.ok((await device.kernel.packs.installFromCatalog(audioPackId('qaa', 'qaa_ult'))).ok);
    assert.deepEqual(device.kernel.corpus.index('qaa'), built, 'an audio pack leaves the index alone');
    assert.ok(!device.kernel.journal.read(beforeAudio).some((entry) => entry.type === 'IndexBuilt'));

    world.fixtures.publish('unfoldingWord', 'qaa_tn', 'v2');
    await device.kernel.catalog.refresh();
    const beforeUpdate = device.kernel.journal.stats().lastSeq;
    assert.ok((await device.kernel.packs.update(languagePackId('qaa'))).ok);
    const rebuilt = device.kernel.journal
      .read(beforeUpdate)
      .filter((entry) => entry.type === 'IndexStarted' || entry.type === 'IndexBuilt')
      .map((entry) => entry.type);
    assert.deepEqual(rebuilt, ['IndexBuilt'], 'a text update rebuilds a wanted index by itself');
    assert.equal(device.kernel.corpus.index('qaa').built, true);
    assert.equal((await device.kernel.corpus.fullText('famine', 'qaa')).length, famine.length);

    assert.ok((await device.kernel.packs.remove(languagePackId('qaa'))).ok);
    assert.deepEqual(device.kernel.corpus.index('qaa'), { built: false, entries: 0, bytes: 0 });
    assert.deepEqual(await device.kernel.corpus.fullText('famine', 'qaa'), []);
    assert.equal(device.kernel.corpus.indexWanted('qaa'), true, 'the wish outlives the pack');
    await installFromCatalog(device, [languagePackId('qaa')]);
    assert.equal(device.kernel.corpus.index('qaa').built, true, 'and builds again when text returns');
    await device.kernel.corpus.dropIndex('qaa');
    assert.equal(device.kernel.corpus.indexWanted('qaa'), false);
    assert.deepEqual(device.kernel.corpus.index('qaa'), { built: false, entries: 0, bytes: 0 });
    assert.deepEqual(await device.kernel.corpus.fullText('famine', 'qaa'), []);

    const text = await importLocalBurrito(device, {
      resource: 'zh_cuv',
      language: 'zh',
      abbreviation: 'cuv',
      name: 'Chinese text',
      flavorType: 'scripture',
      flavor: 'textTranslation',
      ingredients: [
        { path: '43-JHN.usfm', bytes: utf8(chinese), mimeType: mimeTypes.usfm, scope: { JHN: ['3'] } },
      ],
    });
    assert.ok(text.ok, text.ok ? '' : text.code);
    await device.kernel.corpus.reindex('zh');
    for (const word of ['世人', '爱世人', '独生子', '永生']) {
      const hits = await device.kernel.corpus.fullText(word, 'zh');
      assert.ok(
        hits.some((hit) => hit.target.kind === 'passage' && hit.target.reference === 'JHN 3:16'),
        `${word} is found inside a sentence with no spaces`,
      );
    }
  },
);
