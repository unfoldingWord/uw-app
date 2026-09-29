import assert from 'node:assert/strict';
import { imagePackId, languagePackId } from '@lib/domain/pack';
import { parseReference } from '@lib/domain/reference';
import { stableJson } from '@lib/json';
import { fromFile, fromPeer } from '@lib/packs/source';
import { fixturePeer } from '../peer';
import { replayJournal } from '../replay';
import { scenario } from '../scenario';

const hour = 60 * 60 * 1000;

export default scenario(
  'DX-3',
  'an exported journal replays through a fresh device to the same snapshot',
  async (world) => {
    world.clock.setUtcOffsetMinutes(-300);
    const field = world.device('field');
    await field.start();
    for (const gap of [26, 3, 21, 50]) {
      world.clock.advance(gap * hour);
      await field.restart();
    }

    const original = field.kernel.snapshot();
    const shared = JSON.parse(JSON.stringify(field.kernel.journal.export())) as unknown;
    const result = await replayJournal(world, shared, 'replayed');

    assert.ok(result.ok, result.ok ? '' : result.reason);
    assert.deepEqual(result.divergence, []);
    assert.equal(stableJson(result.snapshot), stableJson(original));
    assert.equal(result.device.kernel.telemetry.counts().appOpens, 5);
    assert.deepEqual(result.device.kernel.telemetry.daysOfUse().length, 4);

    const library = world.device('library');
    await library.start();
    await library.kernel.catalog.refresh();
    await library.kernel.packs.installFromCatalog(languagePackId('qaa'));
    await library.kernel.packs.installFromCatalog(imagePackId);
    const file = world.fixtures.archive('unfoldingWord', 'qab_obs', 'v1');
    assert.ok(file);
    await library.adapters.files.mkdir('imports');
    await library.adapters.files.writeBytes('imports/qab_obs.zip', file);
    await library.kernel.packs.install(fromFile('imports/qab_obs.zip'));
    const peer = fixturePeer(world, [
      { publisher: 'unfoldingWord', resource: 'qab_obs-sq', language: 'qab', tag: 'v1' },
    ]);
    await library.kernel.packs.install(fromPeer(peer));
    world.clock.advance(hour);
    world.fixtures.publish('unfoldingWord', 'qaa_tn', 'v2');
    await library.kernel.catalog.refresh();
    await library.kernel.packs.update(languagePackId('qaa'));
    await library.kernel.packs.remove(imagePackId);
    await library.kernel.corpus.reindex('qaa');
    const ruth = parseReference('RUT 1:16');
    assert.ok(ruth.ok);
    assert.ok(await library.kernel.corpus.passage(ruth.reference, { language: 'qaa' }));
    await library.restart();

    const recorded = library.kernel.snapshot();
    const exported = JSON.parse(JSON.stringify(library.kernel.journal.export())) as unknown;
    const rebuilt = await replayJournal(world, exported, 'library-replayed');
    assert.ok(rebuilt.ok, rebuilt.ok ? '' : rebuilt.reason);
    assert.deepEqual(rebuilt.divergence, []);
    assert.equal(stableJson(rebuilt.snapshot), stableJson(recorded));
    const corpus = rebuilt.snapshot.modules.corpus as {
      languages: Record<string, unknown>;
      indexes: Record<string, unknown>;
    };
    assert.deepEqual(Object.keys(corpus.languages), ['qaa', 'qab'], 'the corpus is part of the snapshot');
    assert.deepEqual(Object.keys(corpus.indexes), ['qaa']);
    assert.equal(
      rebuilt.device.kernel.corpus.summary('qaa').notes?.burritos,
      1,
      'the replayed update leaves one release of the notes',
    );
    assert.deepEqual(
      rebuilt.device.kernel.packs.installed().map((pack) => [pack.pack, pack.source, pack.burritos.length]),
      [
        ['language:qaa', 'catalog', 11],
        ['language:qab', 'peer', 2],
      ],
    );
    assert.deepEqual(
      rebuilt.device.adapters.files.tree().filter((path) => path.startsWith('packs/')),
      library.adapters.files.tree().filter((path) => path.startsWith('packs/')),
    );

    const bounded = world.device('bounded', { journalLimit: 8 });
    await bounded.start();
    for (let day = 0; day < 5; day += 1) {
      world.clock.advance(24 * hour);
      await bounded.restart();
    }
    await bounded.kernel.catalog.refresh();
    await bounded.kernel.packs.installFromCatalog(languagePackId('qab'));
    const kept = bounded.kernel.journal.stats();
    assert.ok(kept.dropped > 0, 'the bounded device has dropped events');
    const boundedExport = JSON.parse(JSON.stringify(bounded.kernel.journal.export())) as unknown;
    const boundedReplay = await replayJournal(world, boundedExport, 'bounded-replayed');
    assert.ok(boundedReplay.ok, boundedReplay.ok ? '' : boundedReplay.reason);
    assert.equal(boundedReplay.dropped, kept.dropped);
    assert.deepEqual(boundedReplay.divergence, []);
    assert.equal(stableJson(boundedReplay.snapshot), stableJson(bounded.kernel.snapshot()));
    assert.deepEqual(boundedReplay.device.kernel.telemetry.counts(), bounded.kernel.telemetry.counts());
    assert.equal(bounded.kernel.telemetry.counts().appOpens, 6);
    assert.equal(bounded.kernel.telemetry.daysOfUse().length, 6);
    assert.deepEqual(bounded.kernel.telemetry.counts().languagePackDownloads, { qab: 1 });
  },
);
