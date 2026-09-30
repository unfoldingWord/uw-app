import assert from 'node:assert/strict';
import { readArchive, writeArchive } from '@lib/burrito/archive';
import { fromUtf8, utf8 } from '@lib/burrito/files';
import { languagePackId } from '@lib/domain/pack';
import type { ReleaseRef } from '@lib/domain/release';
import { fromFile, fromPeer, type PeerDelivery } from '@lib/packs/source';
import type { SimDevice } from '../device';
import { installFromCatalog } from '../install';
import { scenario } from '../scenario';
import { servicesOf } from '../services';
import { transferThroughServices } from '../transfer';

const crafted = 'c'.repeat(40);

function withRevision(archive: Uint8Array, revision: string): Uint8Array {
  const read = readArchive(archive);
  if (!read.ok) {
    throw new Error('fixture archive unreadable');
  }
  const files = new Map(read.files);
  const metadata = JSON.parse(fromUtf8(files.get('metadata.json') ?? new Uint8Array())) as {
    identification: { primary: Record<string, Record<string, { revision: string }>> };
  };
  for (const authority of Object.values(metadata.identification.primary)) {
    for (const entry of Object.values(authority)) {
      entry.revision = revision;
    }
  }
  files.set('metadata.json', utf8(JSON.stringify(metadata)));
  return writeArchive(files, { root: 'qaa_ult', mtime: new Date(2026, 8, 1) });
}

function literalOf(device: SimDevice) {
  return device.kernel.packs
    .installed()
    .find((pack) => pack.pack === languagePackId('qaa'))
    ?.burritos.find((burrito) => burrito.provenance.resource === 'qaa_ult');
}

function peerOf(ref: ReleaseRef, archive: Uint8Array, commit: string, bytes: number): PeerDelivery {
  return {
    offered: () => [{ ...ref, row: 'text', bytes, commit }],
    async receive() {
      return { ok: true, archive };
    },
  };
}

export default scenario(
  'SH-3',
  'a file or a peer that would replace a catalog release with a different commit asks first, and the source shows in Storage and on the Licence page',
  async (world) => {
    const genuine = world.fixtures.archive('unfoldingWord', 'qaa_ult', 'v1');
    assert.ok(genuine);
    const forged = withRevision(genuine, crafted);

    const phone = world.device('phone');
    await phone.start();
    await installFromCatalog(phone, [languagePackId('qaa')]);
    const original = literalOf(phone);
    assert.ok(original);
    assert.equal(original.source, 'catalog');

    await phone.adapters.files.mkdir('imports');
    await phone.adapters.files.writeBytes('imports/forged.zip', forged);
    const before = phone.kernel.journal.stats().lastSeq;
    const asked = await phone.kernel.packs.install(fromFile('imports/forged.zip'));
    assert.ok(!asked.ok);
    assert.equal(asked.code, 'pack.replace-unconfirmed');
    assert.deepEqual(asked.replaces, [
      {
        publisher: 'unfoldingWord',
        resource: 'qaa_ult',
        title: original.provenance.title,
        source: 'file',
        installed: { tag: 'v1', commit: original.provenance.commit },
        incoming: { tag: 'unrecorded', commit: crafted },
      },
    ]);
    assert.deepEqual(
      phone.kernel.journal.read(before).map((entry) => [entry.type, entry.payload]),
      [['Failure', { code: 'pack.replace-unconfirmed', context: { pack: 'language:qaa', step: 'file' } }]],
      'asking installs nothing and journals only why it stopped',
    );
    assert.deepEqual(literalOf(phone), original, 'the catalog release stays until the leader chooses');

    await phone.kernel.packs.declineReplace();
    const nothing = await phone.kernel.packs.confirmReplace();
    assert.ok(!nothing.ok && nothing.code === 'pack.empty-plan', 'keeping it leaves nothing to confirm');
    assert.deepEqual(literalOf(phone), original);

    const services = servicesOf(phone);
    phone.adapters.files.offerExternal('content://downloads/forged.zip', forged);
    const question = await services.languages.importOpened('content://downloads/forged.zip');
    assert.ok(!question.ok && question.confirm !== undefined);
    assert.equal(
      question.confirm.question,
      'Replace Fixture Literal Text, which you downloaded from the catalog, with the copy in this file?',
    );
    assert.equal(question.confirm.replace, 'Replace');
    assert.equal(question.confirm.keep, 'Keep the catalog copy');
    const replaced = await services.languages.confirmReplace();
    assert.ok(replaced.ok, replaced.ok ? '' : replaced.code);
    const now = literalOf(phone);
    assert.equal(now?.source, 'file');
    assert.equal(now?.provenance.commit, crafted);
    assert.equal(now?.provenance.tag, 'unrecorded');
    assert.ok(
      !(await phone.adapters.files.exists('packs/.inbox/import.zip')),
      'the kept file is gone once installed',
    );

    const storage = await phone.kernel.packs.storage();
    assert.deepEqual(storage.packs.find((pack) => pack.pack === languagePackId('qaa'))?.sources, [
      'catalog',
      'file',
    ]);
    const licence = services.about.licence().onPhone.find((row) => row.resource === 'qaa_ult');
    assert.equal(licence?.source, 'file');
    assert.equal(licence?.sourceLabel, 'From a file');
    assert.ok(
      services.about.licence().onPhone.some((row) => row.sourceLabel === 'From the catalog'),
      'every other resource names the catalog',
    );

    const nearby = world.device('nearby');
    await nearby.start();
    await installFromCatalog(nearby, [languagePackId('qaa')]);
    const sent = await transferThroughServices(phone, nearby, {
      language: 'qaa',
      resources: [{ publisher: 'unfoldingWord', resource: 'qaa_ult' }],
    });
    assert.ok(!sent.received.ok && sent.received.confirm !== undefined, 'the receiving screen asks in place');
    assert.equal(
      sent.received.confirm.question,
      'Replace Fixture Literal Text, which you downloaded from the catalog, with the copy from the other phone?',
    );
    assert.equal(literalOf(nearby)?.source, 'catalog');
    const accepted = await servicesOf(nearby).transfer.confirmReplace();
    assert.ok(accepted.ok && accepted.state === 'ready-to-read');
    assert.equal(literalOf(nearby)?.provenance.commit, crafted);
    assert.equal(literalOf(nearby)?.source, 'peer');
    assert.ok(
      !(await nearby.adapters.files.exists('transfer/incoming')),
      'the received archives are cleared once the confirmed install ends',
    );

    const same = world.device('same');
    await same.start();
    await installFromCatalog(same, [languagePackId('qaa')]);
    await same.adapters.files.mkdir('imports');
    await same.adapters.files.writeBytes('imports/genuine.zip', genuine);
    const plain = await same.kernel.packs.install(fromFile('imports/genuine.zip'));
    assert.ok(plain.ok, 'a file with the installed commit installs without asking');

    const receiver = world.device('receiver');
    await receiver.start();
    await installFromCatalog(receiver, [languagePackId('qaa')]);
    const ref = { publisher: 'unfoldingWord', resource: 'qaa_ult', language: 'qaa', tag: 'v1' };
    const catalogCommit = literalOf(receiver)?.provenance.commit ?? '';
    const honest = await receiver.kernel.packs.install(
      fromPeer(peerOf(ref, genuine, catalogCommit, genuine.byteLength)),
    );
    assert.ok(honest.ok, 'a peer offering the installed commit installs without asking');

    const other = world.device('other');
    await other.start();
    await installFromCatalog(other, [languagePackId('qaa')]);
    const peered = await other.kernel.packs.install(
      fromPeer(peerOf(ref, forged, crafted, forged.byteLength)),
    );
    assert.ok(!peered.ok && peered.code === 'pack.replace-unconfirmed');
    assert.equal(peered.replaces?.[0]?.source, 'peer');
    assert.deepEqual(peered.replaces?.[0]?.incoming, { tag: 'v1', commit: crafted });
    const confirmed = await other.kernel.packs.confirmReplace();
    assert.ok(confirmed.ok, confirmed.ok ? '' : confirmed.code);
    assert.equal(literalOf(other)?.source, 'peer');
    assert.equal(literalOf(other)?.provenance.commit, crafted);
  },
);
