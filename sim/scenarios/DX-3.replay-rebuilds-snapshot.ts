import assert from 'node:assert/strict';
import { imagePackId, languagePackId } from '@lib/domain/pack';
import { parseReference } from '@lib/domain/reference';
import { stableJson } from '@lib/json';
import { fromFile, fromPeer } from '@lib/packs/source';
import { installFromCatalog } from '../install';
import { fixturePeer } from '../peer';
import { replayJournal } from '../replay';
import { scenario } from '../scenario';
import { transferBetween } from '../transfer';

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
    const tuesday = await library.kernel.formation.create('Tuesday group');
    const youth = await library.kernel.formation.create('Youth leaders');
    assert.ok(tuesday && youth);
    await library.kernel.formation.start(tuesday.id, 'qaa');
    await library.kernel.formation.complete(tuesday.id);
    await library.kernel.formation.saveNote(tuesday.id, 'foundations', 1, 'Maria asked about the light');
    await library.kernel.formation.advance(youth.id, { track: 'training', session: 2 });
    await library.kernel.formation.start(youth.id, 'qaa');
    await library.kernel.formation.complete(youth.id);
    await library.kernel.formation.rename(youth.id, 'Youth leaders on Friday');
    await library.kernel.formation.activate(tuesday.id);
    const elders = await library.kernel.formation.create('Elders');
    assert.ok(elders);
    await library.kernel.formation.remove(elders.id);
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
    assert.deepEqual(rebuilt.snapshot.modules.formation, {
      groups: 2,
      active: tuesday.id,
      positions: {
        [tuesday.id]: { track: 'foundations', session: 1, movement: 'translation' },
        [youth.id]: { track: 'training', session: 3 },
      },
      notes: 1,
    });
    assert.deepEqual(
      rebuilt.device.kernel.formation.groups().map((group) => group.name),
      ['', ''],
      'replay stands in for the names the journal never held',
    );
    assert.deepEqual(rebuilt.device.kernel.telemetry.counts().formationSessionsStarted, { qaa: 2 });
    assert.equal(
      rebuilt.device.kernel.corpus.summary('qaa').notes?.burritos,
      1,
      'the replayed update leaves one release of the notes',
    );
    assert.deepEqual(
      rebuilt.device.kernel.packs.installed().map((pack) => [pack.pack, pack.source, pack.burritos.length]),
      [
        ['language:qaa', 'catalog', 12],
        ['language:qab', 'peer', 2],
      ],
    );
    assert.deepEqual(
      rebuilt.device.adapters.files.tree().filter((path) => path.startsWith('packs/')),
      library.adapters.files.tree().filter((path) => path.startsWith('packs/')),
    );

    const giver = world.device('giver', { platform: 'ios' });
    await giver.start();
    await installFromCatalog(giver, [languagePackId('qab')]);
    const taker = world.device('taker', { platform: 'android' });
    await taker.start();
    const moved = await transferBetween(giver, taker, { language: 'qab' });
    assert.ok(moved.installed?.ok);
    const told = await taker.kernel.corpus.story(1, 'qab');
    assert.ok(told);
    assert.ok((await taker.kernel.share.story(told, { locale: 'en' })).ok);
    await taker.restart();
    const takerSnapshot = taker.kernel.snapshot();
    const takerJournal = JSON.parse(JSON.stringify(taker.kernel.journal.export())) as unknown;
    const takerReplay = await replayJournal(world, takerJournal, 'taker-replayed');
    assert.ok(takerReplay.ok, takerReplay.ok ? '' : takerReplay.reason);
    assert.deepEqual(takerReplay.divergence, [], 'a transfer and a share replay event for event');
    assert.equal(stableJson(takerReplay.snapshot), stableJson(takerSnapshot));
    assert.deepEqual(
      takerReplay.device.kernel.packs.installed().map((pack) => [pack.pack, pack.source]),
      [['language:qab', 'peer']],
      'the sim world stands in for the peer with the same releases',
    );
    const takerCounts = takerReplay.device.kernel.telemetry.counts();
    assert.equal(takerCounts.transfersCompleted, 1);
    assert.equal(takerCounts.sharesSent, 1);

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
