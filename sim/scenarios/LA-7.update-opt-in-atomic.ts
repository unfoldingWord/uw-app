import assert from 'node:assert/strict';
import { readArchive, writeArchive } from '@lib/burrito/archive';
import { languagePackId } from '@lib/domain/pack';
import { archiveUrlOf } from '@lib/domain/release';
import type { SimDevice } from '../device';
import { scenario } from '../scenario';

const pack = languagePackId('qaa');
const notes = 'packs/language/qaa/unfoldingWord/qaa_tn';

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

export default scenario(
  'LA-7',
  'updates are checked against the catalog, opt-in, and replace the pack atomically',
  async (world) => {
    const phone = world.device('phone');
    await phone.start();
    await phone.kernel.catalog.refresh();
    assert.ok((await phone.kernel.packs.installFromCatalog(pack)).ok);
    const original = await phone.adapters.files.readBytes(`${notes}/ingredients/tn_RUT.tsv`);

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

    phone.adapters.files.failRename('packs/language/qaa');
    const interrupted = await phone.kernel.packs.update(pack);
    assert.equal(!interrupted.ok && interrupted.code, 'files.io');

    for (const failed of [timedOut, corrupt, interrupted]) {
      assert.equal(failed.ok, false);
    }
    assert.deepEqual(await phone.adapters.files.readBytes(`${notes}/ingredients/tn_RUT.tsv`), original);
    assert.equal(tagsOf(phone).qaa_tn, 'v1', 'every failed update leaves the old pack whole');
    assert.ok(
      !phone.adapters.files.tree().some((path) => path.startsWith('packs/.')),
      'nothing is left staged',
    );
    const failures = phone.kernel.journal.read().filter((entry) => entry.type === 'PackFailed');
    assert.deepEqual(
      failures.map((entry) => entry.type === 'PackFailed' && entry.payload.code),
      ['http.timeout', 'pack.checksum-mismatch', 'files.io'],
    );

    const updated = await phone.kernel.packs.update(pack);
    assert.ok(updated.ok, updated.ok ? '' : updated.code);
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
    const metadata = JSON.parse(await phone.adapters.files.readText(`${notes}/metadata.json`)) as {
      identification: { primary: { dcs: Record<string, { revision: string }> } };
    };
    assert.equal(metadata.identification.primary.dcs['unfoldingWord/qaa_tn']?.revision, 'v2');
    assert.deepEqual(await phone.kernel.packs.updates(), []);

    await phone.adapters.files.mkdir('packs/.old/language');
    await phone.adapters.files.rename('packs/language/qaa', 'packs/.old/language/qaa');
    await phone.adapters.files.mkdir('packs/.staging/id-crashed/unfoldingWord/qaa_tn');
    await phone.adapters.files.mkdir('packs/language/qzz/unfoldingWord/qzz_obs');
    await phone.restart();
    assert.equal(
      await phone.adapters.files.exists(`${notes}/metadata.json`),
      true,
      'a pack moved aside when the app stopped is restored on start',
    );
    assert.ok(
      !phone.adapters.files.tree().some((path) => path.startsWith('packs/.') || path.includes('qzz')),
      'staging, the old copy and a pack the database never recorded are cleaned on start',
    );
    assert.equal((await phone.kernel.packs.status('qaa')).complete, true);
  },
);
