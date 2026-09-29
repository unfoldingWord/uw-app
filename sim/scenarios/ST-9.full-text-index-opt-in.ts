import assert from 'node:assert/strict';
import { languagePackId } from '@lib/domain/pack';
import { installFixturePacks } from '../corpus-fixtures';
import { scenario } from '../scenario';

export default scenario(
  'ST-9',
  'full-text search is built on the device only when asked, after its storage cost is shown, and searches downloaded content',
  async (world) => {
    const device = world.device('phone');
    await device.start();
    await installFixturePacks(device, [languagePackId('qaa')]);
    const corpus = device.kernel.corpus;

    assert.deepEqual(corpus.index('qaa'), { built: false, entries: 0, bytes: 0 });
    assert.deepEqual(await corpus.fullText('famine', 'qaa'), [], 'no full-text hits before the index exists');
    const cost = await corpus.indexCost('qaa');
    assert.ok(cost.bytes > 0 && cost.entries > 0, 'the storage cost is known before building');
    assert.ok(
      !device.kernel.journal.read().some((entry) => entry.type === 'IndexStarted'),
      'estimating the cost builds nothing',
    );

    const built = await corpus.reindex('qaa');
    assert.equal(built.built, true);
    assert.equal(built.entries, cost.entries);
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

    await device.kernel.corpus.drop(languagePackId('qaa'));
    assert.deepEqual(device.kernel.corpus.index('qaa'), { built: false, entries: 0, bytes: 0 });
    assert.deepEqual(await device.kernel.corpus.fullText('famine', 'qaa'), []);
  },
);
