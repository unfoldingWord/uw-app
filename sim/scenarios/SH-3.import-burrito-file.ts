import assert from 'node:assert/strict';
import { readArchive, writeArchive } from '@lib/burrito/archive';
import { fromUtf8, md5Hex, utf8 } from '@lib/burrito/files';
import { unrecordedTag } from '@lib/burrito/metadata';
import { validate } from '@lib/burrito/validate';
import { languagePackId } from '@lib/domain/pack';
import { fromFile, fromPeer } from '@lib/packs/source';
import { decodeFrame, type Message } from '@lib/transfer/protocol';
import { fixtureRows } from '../fixtures/rows';
import { installFromCatalog } from '../install';
import { fixturePeer } from '../peer';
import { scenario } from '../scenario';
import { transferBetween } from '../transfer';

type Metadata = { identification: Record<string, unknown> } & Record<string, unknown>;

function rewritten(archive: Uint8Array, change: (metadata: Metadata) => void, extra?: string): Uint8Array {
  const read = readArchive(archive);
  if (!read.ok) {
    throw new Error('fixture archive unreadable');
  }
  const files = new Map(read.files);
  const metadata = JSON.parse(fromUtf8(files.get('metadata.json') ?? new Uint8Array())) as Metadata;
  change(metadata);
  files.set('metadata.json', utf8(JSON.stringify(metadata)));
  if (extra !== undefined) {
    files.set(extra, utf8('not listed in the metadata'));
  }
  return writeArchive(files, { root: 'burrito', mtime: new Date(2026, 8, 1) });
}

function joined(parts: readonly Uint8Array[]): Uint8Array {
  const bytes = new Uint8Array(parts.reduce((sum, part) => sum + part.byteLength, 0));
  let offset = 0;
  for (const part of parts) {
    bytes.set(part, offset);
    offset += part.byteLength;
  }
  return bytes;
}

function carried(frames: readonly Uint8Array[]): Message[] {
  return frames.map((frame) => {
    const decoded = decodeFrame(frame);
    assert.ok(decoded.ok, 'every frame on the link is a protocol message');
    return decoded.message;
  });
}

export default scenario(
  'SH-3',
  'a burrito opened from a file installs through the same path as a download, carrying its own provenance',
  async (world) => {
    const qab = world.fixtures.archive('unfoldingWord', 'qab_obs', 'v1');
    assert.ok(qab);

    const online = world.device('online');
    await online.start();
    await online.kernel.catalog.refresh();
    assert.ok((await online.kernel.packs.installFromCatalog(languagePackId('qab'))).ok);

    const offline = world.device('offline');
    await offline.start();
    offline.adapters.http.setOnline(false);
    await offline.adapters.files.mkdir('imports');
    await offline.adapters.files.writeBytes('imports/qab_obs.zip', qab);
    const imported = await offline.kernel.packs.install(fromFile('imports/qab_obs.zip'));
    assert.ok(imported.ok, imported.ok ? '' : imported.code);
    assert.deepEqual(
      offline.kernel.journal.read().map((entry) => entry.type),
      ['AppOpened', 'ImportReceived', 'PackInstallStarted', 'PackInstallProgressed', 'PackInstalled'],
    );
    const installedFrom = offline.kernel.packs.installed()[0];
    assert.equal(installedFrom?.source, 'file');
    const [burrito] = installedFrom.burritos;
    assert.equal(
      burrito?.provenance.tag,
      unrecordedTag,
      'a DCS burrito carries its commit but not its tag, and this phone has no catalog to find it in',
    );
    assert.match(burrito.provenance.commit, /^[0-9a-f]{40}$/);
    assert.match(burrito.provenance.licence, /CC BY-SA 4\.0/);

    const listed = world.device('listed');
    await listed.start();
    await listed.kernel.catalog.refresh();
    await listed.adapters.files.mkdir('imports');
    await listed.adapters.files.writeBytes('imports/qab_obs.zip', qab);
    const known = await listed.kernel.packs.install(fromFile('imports/qab_obs.zip'));
    assert.ok(known.ok, known.ok ? '' : known.code);
    assert.deepEqual(
      known.pack.burritos.map((item) => [item.provenance.tag, item.provenance.commit]),
      [['v1', burrito.provenance.commit]],
      'with the catalog on the phone, the commit names the release it came from',
    );

    const peered = world.device('peered');
    await peered.start();
    const peer = fixturePeer(world, [
      { publisher: 'unfoldingWord', resource: 'qab_obs', language: 'qab', tag: 'v1' },
      { publisher: 'unfoldingWord', resource: 'qab_obs-sq', language: 'qab', tag: 'v1' },
    ]);
    const received = await peered.kernel.packs.install(fromPeer(peer), {
      resources: [{ publisher: 'unfoldingWord', resource: 'qab_obs' }],
    });
    assert.ok(received.ok, received.ok ? '' : received.code);
    assert.deepEqual(peer.received(), ['unfoldingWord/qab_obs@v1'], 'only the chosen resource travels');

    const within = (device: typeof online) =>
      device.kernel.packs
        .installed()
        .flatMap((pack) => pack.burritos)
        .flatMap((item) => {
          const root = `${item.root}/`;
          const key = `${item.provenance.publisher}/${item.provenance.resource}/`;
          return device.adapters.files
            .tree()
            .filter((path) => path.startsWith(root))
            .map((path) => key + path.slice(root.length));
        })
        .sort();
    const burritoFiles = (device: typeof online) =>
      within(device).filter((path) => path.startsWith('unfoldingWord/qab_obs/'));
    const reference = burritoFiles(online);
    assert.ok(reference.length > 0);
    assert.deepEqual(burritoFiles(offline), reference, 'a file lands as a download lands');
    assert.deepEqual(burritoFiles(peered), reference, 'a transfer lands the same way');
    const rootOf = (device: typeof online) =>
      device.kernel.packs
        .installed()
        .flatMap((pack) => pack.burritos)
        .find((item) => item.provenance.resource === 'qab_obs')?.root ?? '';
    for (const path of reference.filter((item) => !item.endsWith('/'))) {
      const inside = path.slice('unfoldingWord/qab_obs/'.length);
      assert.deepEqual(
        await offline.adapters.files.readBytes(`${rootOf(offline)}/${inside}`),
        await online.adapters.files.readBytes(`${rootOf(online)}/${inside}`),
      );
    }

    const local = rewritten(
      qab,
      (metadata) => {
        metadata.identification.primary = {
          dcs: { 'Local-Church/qab_obs-local': { revision: 'v3', timestamp: '2026-09-20T00:00:00Z' } },
        };
      },
      'ingredients/extra.txt',
    );
    await offline.adapters.files.writeBytes('imports/local.zip', local);
    const outside = await offline.kernel.packs.install(fromFile('imports/local.zip'));
    assert.ok(outside.ok, outside.ok ? '' : outside.code);
    const localBurrito = outside.pack.burritos.find((item) => item.provenance.publisher === 'Local-Church');
    assert.deepEqual(
      localBurrito && {
        ...localBurrito.provenance,
        licence: localBurrito.provenance.licence.includes('CC BY-SA 4.0'),
      },
      {
        publisher: 'Local-Church',
        resource: 'qab_obs-local',
        language: 'qab',
        tag: unrecordedTag,
        commit: 'v3',
        licence: true,
        title: 'Fixture B Open Bible Stories',
      },
      'a burrito the catalog does not list keeps the provenance its metadata carries',
    );
    assert.equal(outside.pack.burritos.length, 2, 'it joins the language pack beside what was there');
    assert.ok(
      !offline.adapters.files.tree().some((path) => path.endsWith('extra.txt')),
      'a file the metadata does not list is not installed',
    );

    const anonymous = rewritten(qab, (metadata) => {
      delete metadata.identification.primary;
    });
    await offline.adapters.files.writeBytes('imports/anonymous.zip', anonymous);
    const before = offline.kernel.journal.stats().lastSeq;
    const refused = await offline.kernel.packs.install(fromFile('imports/anonymous.zip'));
    assert.equal(!refused.ok && refused.code, 'pack.no-provenance');
    assert.deepEqual(
      offline.kernel.journal.read(before).map((entry) => entry.type),
      ['Failure'],
      'content without provenance never starts installing',
    );
    const missing = await offline.kernel.packs.install(fromFile('imports/nothing.zip'));
    assert.equal(!missing.ok && missing.code, 'files.not-found');

    const opened = world.device('opened-from-files');
    await opened.start();
    opened.adapters.http.setOnline(false);
    const handed =
      'content://com.android.externalstorage.documents/document/primary%3ADownload%2Fqab_obs.zip';
    opened.adapters.files.offerExternal(handed, qab);
    const adopted = await opened.kernel.packs.importFile(handed);
    assert.ok(adopted.ok, adopted.ok ? '' : adopted.code);
    assert.equal(opened.kernel.packs.installed()[0]?.source, 'file');
    assert.ok(
      !opened.adapters.files.tree().some((path) => path.startsWith('packs/.inbox')),
      'the adopted copy is removed once installed',
    );
    const gone = await opened.kernel.packs.importFile('content://gone/qab_obs.zip');
    assert.equal(gone.ok, false);
    assert.equal(!gone.ok && gone.code, 'files.not-found');

    const giver = world.device('giver', { platform: 'ios' });
    await giver.start();
    await installFromCatalog(giver, [languagePackId('qab')]);
    const taker = world.device('taker', { platform: 'android' });
    await taker.start();
    const frames: Uint8Array[] = [];
    const stopListening = world.bus.tap((frame) => frames.push(frame));
    const moved = await transferBetween(giver, taker, { language: 'qab' });
    stopListening();
    assert.ok(moved.installed?.ok, 'a transfer installs through the same path as a download and a file');
    const messages = carried(frames);
    const plan = messages.find((message) => message.kind === 'plan');
    assert.ok(plan?.kind === 'plan');
    assert.deepEqual(
      plan.items.map((item) => item.key),
      ['unfoldingWord/qab_obs', 'unfoldingWord/qab_obs-sq'],
    );
    for (const [index, item] of plan.items.entries()) {
      const chunks = messages.flatMap((message) =>
        message.kind === 'chunk' && message.item === index ? [message] : [],
      );
      assert.deepEqual(
        chunks.map((chunk) => chunk.seq),
        chunks.map((_, seq) => seq),
      );
      const archive = joined(chunks.map((chunk) => chunk.body));
      assert.equal(archive.byteLength, item.bytes);
      const done = messages.find((message) => message.kind === 'done' && message.item === index);
      assert.ok(done?.kind === 'done' && done.md5 === md5Hex(archive), 'each archive carries its digest');
      const read = readArchive(archive);
      assert.ok(read.ok, `${item.key} travels as a zip another burrito tool can open`);
      const report = validate(read.files, { rows: fixtureRows });
      assert.ok(report.ok, `${item.key} travels as a valid Scripture Burrito`);
    }
    const installedHere = taker.kernel.packs.installed()[0];
    assert.equal(installedHere?.source, 'peer');
    assert.deepEqual(within(taker), within(online), 'a transfer lands the same files in each burrito root');
  },
);
