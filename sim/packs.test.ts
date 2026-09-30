import { describe, expect, it } from 'vitest';
import { readArchive, writeArchive } from '@lib/burrito/archive';
import { fromUtf8, utf8 } from '@lib/burrito/files';
import { imagePackId, languagePackId } from '@lib/domain/pack';
import { archiveUrlOf } from '@lib/domain/release';
import { admittedRows } from '@lib/burrito/flavors';
import { validate } from '@lib/burrito/validate';
import { fromCatalog, fromFile, fromPeer, type PeerSession } from '@lib/packs/source';
import { readBurrito } from '@lib/packs/tree';
import { fixturePeer } from './peer';
import { createWorld } from './world';

async function phone(capacity?: number) {
  const world = createWorld();
  const device = world.device('phone', capacity === undefined ? {} : { capacity });
  await device.start();
  await device.kernel.catalog.refresh();
  return { world, device };
}

type Device = Awaited<ReturnType<typeof phone>>['device'];

function typesSince(device: Device, seq: number): string[] {
  return device.kernel.journal.read(seq).map((entry) => entry.type);
}

const qaaObs = { publisher: 'unfoldingWord', resource: 'qaa_obs', language: 'qaa', tag: 'v1' };

describe('packs interface (LA-2, LA-6, LA-7, SH-3)', () => {
  it('announces each install with a PackInstalled that names every burrito root and its provenance', async () => {
    const { device } = await phone();
    await device.kernel.packs.installFromCatalog(languagePackId('qab'));
    const installed = device.kernel.journal.read().find((entry) => entry.type === 'PackInstalled');
    expect(installed?.type === 'PackInstalled' && installed.payload).toEqual({
      install: 'id-000001',
      pack: 'language:qab',
      kind: 'language',
      source: 'catalog',
      language: 'qab',
      resources: 2,
      bytes: expect.any(Number) as number,
      failed: [],
      burritos: [
        {
          root: 'packs/language/qab/id-000001/unfoldingWord/qab_obs',
          row: 'stories',
          publisher: 'unfoldingWord',
          resource: 'qab_obs',
          language: 'qab',
          tag: 'v1',
          commit: expect.stringMatching(/^[0-9a-f]{40}$/) as string,
          bytes: expect.any(Number) as number,
        },
        {
          root: 'packs/language/qab/id-000001/unfoldingWord/qab_obs-sq',
          row: 'storyHelps',
          publisher: 'unfoldingWord',
          resource: 'qab_obs-sq',
          language: 'qab',
          tag: 'v1',
          commit: expect.stringMatching(/^[0-9a-f]{40}$/) as string,
          bytes: expect.any(Number) as number,
        },
      ],
    });
    const [pack] = device.kernel.packs.installed();
    expect(pack?.burritos.map((burrito) => burrito.provenance.title)).toEqual([
      'Fixture B Open Bible Stories',
      'Fixture B OBS Study Questions',
    ]);
    expect(device.adapters.files.tree().every((path) => path.startsWith('packs/') || path === 'packs')).toBe(
      true,
    );
  });

  it('reports what is on the phone and what is missing for a language, and completes it in one tap (HO-5)', async () => {
    const { device } = await phone();
    const before = await device.kernel.packs.status('qaa');
    expect(before).toMatchObject({ pack: 'language:qaa', installed: [], complete: false });
    expect(before.missing).toHaveLength(11);
    const texts = device.kernel.catalog.releases('qaa').filter((release) => release.kind === 'language');
    await device.kernel.packs.install(fromCatalog(texts), {
      resources: [{ publisher: 'unfoldingWord', resource: 'qaa_ult' }],
    });
    const partial = await device.kernel.packs.status('qaa');
    expect(partial.installed.map((burrito) => burrito.provenance.resource)).toEqual(['qaa_ult']);
    expect(partial.missing).toHaveLength(10);
    const seq = device.kernel.journal.stats().lastSeq;
    await device.kernel.packs.installFromCatalog(languagePackId('qaa'));
    const started = device.kernel.journal.read(seq).find((entry) => entry.type === 'PackInstallStarted');
    expect(started?.type === 'PackInstallStarted' && started.payload.releases).toHaveLength(10);
    expect(await device.kernel.packs.status('qaa')).toMatchObject({ complete: true, missing: [] });
  });

  it('fails a download that is offline, missing or not a burrito, and cleans the staging area', async () => {
    const { world, device } = await phone();
    device.adapters.http.setOnline(false);
    expect(await device.kernel.packs.installFromCatalog(imagePackId)).toMatchObject({
      ok: false,
      code: 'http.offline',
    });
    device.adapters.http.setOnline(true);
    const url = archiveUrlOf({ publisher: 'unfoldingWord', resource: 'en_obs', tag: 'v9' });
    device.adapters.http.script(url, { status: 404 });
    expect(await device.kernel.packs.installFromCatalog(imagePackId)).toMatchObject({
      ok: false,
      code: 'http.status',
    });
    world.network.serve(url, { body: 'not a zip' });
    expect(await device.kernel.packs.installFromCatalog(imagePackId)).toMatchObject({
      ok: false,
      code: 'pack.invalid-burrito',
    });
    expect(device.adapters.files.tree()).toEqual(['packs/']);
    expect(device.kernel.packs.installed()).toEqual([]);
  });

  it('refuses a burrito of a flavor the contract does not admit', async () => {
    const { world, device } = await phone();
    const url = archiveUrlOf(qaaObs);
    const read = readArchive((world.network.lookup(url)?.body as Uint8Array | undefined) ?? new Uint8Array());
    if (!read.ok) {
      throw new Error('fixture unreadable');
    }
    const files = new Map(read.files);
    const metadata = JSON.parse(fromUtf8(files.get('metadata.json') ?? new Uint8Array())) as {
      type: { flavorType: { flavor: { name: string } } };
    };
    metadata.type.flavorType.flavor.name = 'x-unknownThing';
    files.set('metadata.json', utf8(JSON.stringify(metadata)));
    world.network.serve(url, { body: writeArchive(files, { mtime: new Date(2026, 8, 1) }) });
    const outcome = await device.kernel.packs.install(fromCatalog([qaaObs]), { pack: languagePackId('qaa') });
    expect(outcome).toMatchObject({ ok: false, code: 'pack.unknown-flavor' });
  });

  it('checks free space before writing when the sizes are known, and maps a full disk to pack.no-space', async () => {
    const { world, device } = await phone(2048);
    const peer = fixturePeer(world, [qaaObs]);
    const seq = device.kernel.journal.stats().lastSeq;
    expect(await device.kernel.packs.install(fromPeer(peer))).toMatchObject({
      ok: false,
      code: 'pack.no-space',
    });
    expect(peer.received()).toEqual([]);
    expect(typesSince(device, seq)).toEqual(['PackInstallStarted', 'PackFailed']);
    expect(device.adapters.files.tree()).toEqual([]);
  });

  it('fails a peer that drops out or sends a different release than it offered', async () => {
    const { world, device } = await phone();
    const offered = fixturePeer(world, [qaaObs]);
    const lost: PeerSession = {
      offered: offered.offered,
      receive: async () => ({ ok: false, code: 'transfer.peer-lost' }),
    };
    expect(await device.kernel.packs.install(fromPeer(lost))).toMatchObject({
      ok: false,
      code: 'transfer.peer-lost',
    });
    const other = world.fixtures.archive('Door43-Catalog', 'qaa_obs', 'v2');
    const swapped: PeerSession = {
      offered: offered.offered,
      receive: async () =>
        other === undefined ? { ok: false, code: 'transfer.peer-lost' } : { ok: true, archive: other },
    };
    expect(await device.kernel.packs.install(fromPeer(swapped))).toMatchObject({
      ok: false,
      code: 'pack.invalid-burrito',
    });
    expect(device.kernel.packs.installed()).toEqual([]);
  });

  it('starts nothing for an empty plan, and reports a removal of a pack that is not there', async () => {
    const { device } = await phone();
    const seq = device.kernel.journal.stats().lastSeq;
    expect(await device.kernel.packs.install(fromCatalog([]))).toMatchObject({
      ok: false,
      code: 'pack.empty-plan',
    });
    expect(await device.kernel.packs.remove(imagePackId)).toEqual({
      ok: false,
      pack: imagePackId,
      code: 'pack.not-found',
    });
    expect(typesSince(device, seq)).toEqual(['Failure', 'Failure']);
    expect(await device.kernel.packs.install(fromFile('imports/none.zip'))).toMatchObject({
      ok: false,
      code: 'files.not-found',
    });
  });

  it('installs an original-language text as its own optional pack, outside every language pack', async () => {
    const { device } = await phone();
    const [hebrew] = device.kernel.catalog.originals().filter((release) => release.language === 'hbo');
    expect(hebrew?.pack).toBe('original:hbo');
    expect(await device.kernel.packs.defaults(languagePackId('qaa'))).not.toContainEqual(
      expect.objectContaining({ kind: 'original' }),
    );
    const outcome = await device.kernel.packs.installFromCatalog('original:hbo');
    expect(outcome.ok && outcome.pack).toMatchObject({
      pack: 'original:hbo',
      kind: 'original',
      language: 'hbo',
    });
    expect(device.adapters.files.tree()).toContain(
      `${outcome.ok ? (outcome.pack.burritos[0]?.root ?? '') : ''}/metadata.json`,
    );
  });

  it('serializes installs so a pack is never written by two at once', async () => {
    const { device } = await phone();
    const first = device.kernel.packs.installFromCatalog(languagePackId('qab'));
    const second = device.kernel.packs.installFromCatalog(languagePackId('qab'));
    expect((await first).ok).toBe(true);
    expect(await second).toMatchObject({ ok: true, install: undefined });
    expect(device.kernel.journal.read().filter((entry) => entry.type === 'PackInstallStarted')).toHaveLength(
      1,
    );
  });

  it('keeps Word Links whole when the Words burrito it shares articles with is replaced (#15)', async () => {
    const { device } = await phone();
    await device.kernel.catalog.refresh();
    const pack = languagePackId('qaa');
    expect((await device.kernel.packs.installFromCatalog(pack)).ok).toBe(true);
    const words = device.kernel.catalog
      .releases('qaa')
      .filter((release) => release.resource === 'qaa_tw' && release.kind === 'language');
    const replaced = await device.kernel.packs.install(fromCatalog(words), { pack });
    expect(replaced.ok).toBe(true);
    const installed = device.kernel.packs.installed().find((item) => item.pack === pack);
    const links = installed?.burritos.find((burrito) => burrito.provenance.resource === 'qaa_twl');
    const tw = installed?.burritos.find((burrito) => burrito.provenance.resource === 'qaa_tw');
    expect(links && tw && links.root !== tw.root).toBe(true);
    const files = device.adapters.files;
    expect(
      files
        .tree()
        .some((path) => !path.endsWith('/') && path.startsWith(`${links?.root ?? ''}/ingredients/payload/`)),
    ).toBe(false);
    const whole = await readBurrito(files, links?.root ?? '');
    expect(validate(whole, { rows: admittedRows }).ok).toBe(true);
    expect(links?.bytes).toBe(await files.size(links?.root ?? ''));
  });
});
