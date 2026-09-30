import assert from 'node:assert/strict';
import { utf8 } from '@lib/burrito/files';
import { readArchive, writeArchive } from '@lib/burrito/archive';
import { languagePackId } from '@lib/domain/pack';
import { parseReference } from '@lib/domain/reference';
import { archiveUrlOf } from '@lib/domain/release';
import { crashAt } from '../crash';
import type { SimDevice } from '../device';
import { scenario } from '../scenario';

const pack = languagePackId('qaa');

function tampered(archive: Uint8Array): Uint8Array {
  const read = readArchive(archive);
  if (!read.ok) {
    throw new Error('fixture archive unreadable');
  }
  const files = new Map(read.files);
  const [path, bytes] = [...files.entries()].find(([key]) => key.endsWith('.tsv')) ?? [];
  if (path === undefined || bytes === undefined) {
    throw new Error('fixture archive has no TSV');
  }
  const changed = bytes.slice();
  changed[0] = (changed[0] ?? 0) ^ 1;
  files.set(path, changed);
  return writeArchive(files, { root: 'qaa_tn', mtime: new Date(2026, 8, 1) });
}

function tagsOf(phone: SimDevice): Record<string, string> {
  return Object.fromEntries(
    (phone.kernel.packs.installed()[0]?.burritos ?? []).map((burrito) => [
      burrito.provenance.resource,
      burrito.provenance.tag,
    ]),
  );
}

function rootsOf(phone: SimDevice): Record<string, string> {
  return Object.fromEntries(
    (phone.kernel.packs.installed()[0]?.burritos ?? []).map((burrito) => [
      burrito.provenance.resource,
      burrito.root,
    ]),
  );
}

const ruth = parseReference('RUT 1:16');

async function notesTags(phone: SimDevice): Promise<string[]> {
  assert.ok(ruth.ok);
  const passage = await phone.kernel.corpus.passage(ruth.reference, { language: 'qaa' });
  return [...new Set((passage?.notes ?? []).map((note) => note.provenance.tag))];
}

function staged(phone: SimDevice): string[] {
  return phone.adapters.files.tree().filter((path) => path.startsWith('packs/.'));
}

function installDirectories(phone: SimDevice, resource: string): string[] {
  const shape = new RegExp(`^packs/language/qaa/[^/]+/unfoldingWord/${resource}/$`);
  return phone.adapters.files.tree().filter((path) => shape.test(path));
}

export default scenario(
  'LA-7',
  'updates are checked against the catalog, opt-in, and replace the pack atomically',
  async (world) => {
    const phone = world.device('phone');
    await phone.start();
    await phone.kernel.catalog.refresh();
    assert.ok((await phone.kernel.packs.installFromCatalog(pack)).ok);
    const firstRoots = rootsOf(phone);
    const notes = firstRoots.qaa_tn ?? '';
    const original = await phone.adapters.files.readBytes(`${notes}/ingredients/RUT.tsv`);

    world.fixtures.publish('unfoldingWord', 'qaa_tn', 'v2');
    assert.deepEqual(await phone.kernel.packs.updates(), [], 'nothing is new until the catalog says so');
    await phone.kernel.catalog.refresh();
    const updates = await phone.kernel.packs.updates();
    assert.deepEqual(
      updates.map((item) => [
        item.pack,
        item.resources.map((entry) => [entry.resource, entry.installed, entry.available.tag]),
      ]),
      [[pack, [['qaa_tn', 'v1', 'v2']]]],
    );
    assert.equal(tagsOf(phone).qaa_tn, 'v1', 'an update is never applied without being asked');

    const newer = archiveUrlOf({ publisher: 'unfoldingWord', resource: 'qaa_tn', tag: 'v2' });
    phone.adapters.http.script(newer, 'timeout');
    const timedOut = await phone.kernel.packs.update(pack);
    assert.equal(!timedOut.ok && timedOut.code, 'http.timeout');

    const good = world.network.lookup(newer);
    assert.ok(good && typeof good.body !== 'string');
    world.network.serve(newer, { body: tampered(good.body) });
    const corrupt = await phone.kernel.packs.update(pack);
    assert.equal(!corrupt.ok && corrupt.code, 'pack.checksum-mismatch');
    world.network.serve(newer, good);

    let grown: Promise<void> | undefined;
    const stopWatching = phone.adapters.files.onWrite((operation, path) => {
      if (
        grown === undefined &&
        path.startsWith('packs/.staging/') &&
        path.endsWith('/ingredients/RUT.tsv')
      ) {
        grown = Promise.resolve().then(() => phone.adapters.files.appendBytes(path, utf8('\n')));
      }
    });
    const changedOnDisk = await phone.kernel.packs.update(pack);
    stopWatching();
    await grown;
    assert.ok(grown !== undefined, 'a staged file was changed after it was unpacked');
    assert.equal(
      !changedOnDisk.ok && changedOnDisk.code,
      'pack.checksum-mismatch',
      'a file whose size on disk is not the listed size is refused, even when the archive was whole',
    );

    phone.adapters.files.failRename('packs/language/qaa');
    const interrupted = await phone.kernel.packs.update(pack);
    assert.equal(!interrupted.ok && interrupted.code, 'files.io');

    assert.deepEqual(await phone.adapters.files.readBytes(`${notes}/ingredients/RUT.tsv`), original);
    assert.equal(tagsOf(phone).qaa_tn, 'v1', 'every failed update leaves the old pack whole');
    assert.deepEqual(staged(phone), [], 'nothing is left staged');
    assert.deepEqual(installDirectories(phone, 'qaa_tn'), [`${notes}/`], 'no half-written release is left');
    const failures = phone.kernel.journal.read().filter((entry) => entry.type === 'PackFailed');
    assert.deepEqual(
      failures.map((entry) => entry.type === 'PackFailed' && entry.payload.code),
      ['http.timeout', 'pack.checksum-mismatch', 'pack.checksum-mismatch', 'files.io'],
    );

    const release = phone.adapters.http.hold(newer);
    const updating = phone.kernel.packs.update(pack);
    await new Promise((resolve) => setImmediate(resolve));
    assert.deepEqual(await notesTags(phone), ['v1'], 'while the update downloads, the passage reads v1');
    release();
    const updated = await updating;
    assert.ok(updated.ok, updated.ok ? '' : updated.code);
    assert.deepEqual(await notesTags(phone), ['v2'], 'once it is in, the passage reads v2 and only v2');
    const started = phone.kernel.journal
      .read()
      .filter((entry) => entry.type === 'PackInstallStarted')
      .at(-1);
    assert.deepEqual(
      started?.type === 'PackInstallStarted' && started.payload.releases,
      [{ publisher: 'unfoldingWord', resource: 'qaa_tn', language: 'qaa', tag: 'v2' }],
      'only the newer resource is downloaded',
    );
    const tags = tagsOf(phone);
    assert.equal(tags.qaa_tn, 'v2');
    assert.equal(tags.qaa_ult, 'v1');
    assert.equal(Object.keys(tags).length, 11);
    const secondRoots = rootsOf(phone);
    assert.notEqual(secondRoots.qaa_tn, notes, 'the new release has a directory of its own');
    assert.deepEqual(
      Object.entries(secondRoots).filter(([resource]) => resource !== 'qaa_tn'),
      Object.entries(firstRoots).filter(([resource]) => resource !== 'qaa_tn'),
      'the burritos an update keeps stay where they are, neither copied nor moved',
    );
    assert.equal(await phone.adapters.files.exists(notes), false, 'the old release is removed once read');
    const metadata = JSON.parse(
      await phone.adapters.files.readText(`${secondRoots.qaa_tn ?? ''}/metadata.json`),
    ) as { identification: { primary: { dcs: Record<string, { revision: string }> } } };
    const updatedNotes = phone.kernel.packs
      .installed()
      .flatMap((item) => item.burritos)
      .find((burrito) => burrito.provenance.resource === 'qaa_tn');
    assert.equal(
      metadata.identification.primary.dcs['unfoldingWord/qaa_tn']?.revision,
      updatedNotes?.provenance.commit,
      'the new burrito is the commit the catalog names for v2',
    );
    assert.deepEqual(await phone.kernel.packs.updates(), []);

    world.fixtures.publish('unfoldingWord', 'qaa_tn', 'v3');
    await phone.kernel.catalog.refresh();
    const beforeRow = crashAt(phone, { db: (sql) => /^INSERT INTO packs /.test(sql) });
    await phone.kernel.packs.update(pack);
    assert.ok(beforeRow.crashed());
    await beforeRow.restart();
    assert.equal(tagsOf(phone).qaa_tn, 'v2', 'a crash before the database row keeps the old release');
    assert.deepEqual(await notesTags(phone), ['v2']);
    assert.deepEqual(installDirectories(phone, 'qaa_tn'), [`${secondRoots.qaa_tn ?? ''}/`]);
    assert.deepEqual(staged(phone), []);

    const beforeIngest = crashAt(phone, { db: (_sql, params) => params[1] === 'PackInstalled' });
    await phone.kernel.packs.update(pack);
    assert.ok(beforeIngest.crashed());
    await beforeIngest.restart();
    assert.equal(tagsOf(phone).qaa_tn, 'v3', 'a crash after the database row keeps the new release');
    assert.deepEqual(await notesTags(phone), ['v3'], 'and the corpus catches up with it on start');
    const thirdRoots = rootsOf(phone);
    assert.deepEqual(installDirectories(phone, 'qaa_tn'), [`${thirdRoots.qaa_tn ?? ''}/`]);

    world.fixtures.publish('unfoldingWord', 'qaa_tn', 'v4');
    await phone.kernel.catalog.refresh();
    const beforeCleanup = crashAt(phone, {
      files: (operation, path) => operation === 'remove' && (thirdRoots.qaa_tn ?? '').startsWith(`${path}/`),
    });
    await phone.kernel.packs.update(pack);
    assert.ok(beforeCleanup.crashed());
    await beforeCleanup.restart();
    assert.equal(tagsOf(phone).qaa_tn, 'v4');
    assert.deepEqual(await notesTags(phone), ['v4']);
    assert.deepEqual(
      installDirectories(phone, 'qaa_tn'),
      [`${rootsOf(phone).qaa_tn ?? ''}/`],
      'a crash after the corpus read the new release leaves the old one to be removed on start',
    );

    await phone.adapters.files.mkdir('packs/.old/language/qaa');
    await phone.adapters.files.mkdir('packs/.staging/id-crashed/unfoldingWord/qaa_tn');
    await phone.adapters.files.mkdir('packs/language/qzz/unfoldingWord/qzz_obs');
    await phone.adapters.files.mkdir('packs/language/qaa/id-999999/unfoldingWord/qaa_tn/ingredients');
    await phone.restart();
    assert.ok(
      !phone.adapters.files
        .tree()
        .some((path) => path.startsWith('packs/.') || path.includes('qzz') || path.includes('id-999999')),
      'staging, old copies, a pack the database never recorded and a release it never pointed to go on start',
    );
    assert.equal((await phone.kernel.packs.status('qaa')).complete, true);
    assert.deepEqual(await notesTags(phone), ['v4']);
  },
);
