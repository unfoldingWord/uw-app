import assert from 'node:assert/strict';
import { readArchive, writeArchive } from '@lib/burrito/archive';
import { fromUtf8, utf8 } from '@lib/burrito/files';
import { languagePackId } from '@lib/domain/pack';
import { fromFile, fromPeer } from '@lib/packs/source';
import { fixturePeer } from '../peer';
import { scenario } from '../scenario';

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
    assert.equal(burrito?.provenance.tag, 'v1');
    assert.match(burrito.provenance.commit, /^[0-9a-f]{40}$/);
    assert.match(burrito.provenance.licence, /CC BY-SA 4\.0/);

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

    const burritoFiles = (tree: readonly string[]) => tree.filter((path) => path.includes('qab_obs/'));
    const reference = burritoFiles(online.adapters.files.tree());
    assert.deepEqual(
      burritoFiles(offline.adapters.files.tree()),
      reference,
      'a file lands where a download lands',
    );
    assert.deepEqual(burritoFiles(peered.adapters.files.tree()), reference, 'a transfer lands there too');
    for (const path of reference.filter((item) => !item.endsWith('/'))) {
      assert.deepEqual(
        await offline.adapters.files.readBytes(path),
        await online.adapters.files.readBytes(path),
      );
    }

    const local = rewritten(
      qab,
      (metadata) => {
        metadata.identification.primary = {
          dcs: { 'Local-Church/qab_obs-local': { revision: 'v3', timestamp: '2026-09-20T00:00:00Z' } },
        };
        metadata.identification.upstream = {};
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
        tag: 'v3',
        commit: 'unrecorded',
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
  },
);
