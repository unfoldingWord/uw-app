import assert from 'node:assert/strict';
import { audioPackId, languagePackId } from '@lib/domain/pack';
import { fromCatalog } from '@lib/packs/source';
import { scenario } from '../scenario';

export default scenario(
  'LA-4',
  'audio is a separate download per resource per language, never part of the language pack',
  async (world) => {
    const phone = world.device('phone');
    await phone.start();
    await phone.kernel.catalog.refresh();
    const language = languagePackId('qaa');
    const audio = audioPackId('qaa', 'qaa_ult-audio');
    const audioRelease = phone.kernel.catalog.releases('qaa').find((release) => release.row === 'audio');
    assert.equal(audioRelease?.pack, audio);

    assert.ok((await phone.kernel.packs.installFromCatalog(language)).ok);
    assert.ok(!phone.kernel.packs.installed().some((pack) => pack.kind === 'audio'));

    const outcome = await phone.kernel.packs.installFromCatalog(audio);
    assert.ok(outcome.ok, outcome.ok ? '' : outcome.code);
    const installedAudio = phone.kernel.packs.installed().find((pack) => pack.pack === audio);
    assert.equal(installedAudio?.kind, 'audio');
    assert.equal(installedAudio.language, 'qaa');
    assert.deepEqual(
      installedAudio.burritos.map((burrito) => burrito.root),
      ['packs/audio/qaa/qaa_ult-audio/unfoldingWord/qaa_ult-audio'],
    );
    assert.ok(
      phone.adapters.files.tree().some((path) => path.endsWith('.mp3') && path.startsWith('packs/audio/')),
    );

    const text = phone.kernel.catalog.releases('qaa').find((release) => release.resource === 'qaa_ult');
    assert.ok(text);
    const before = phone.kernel.journal.stats().lastSeq;
    const mixed = await phone.kernel.packs.install(fromCatalog([audioRelease, text]));
    assert.deepEqual(mixed, { ok: false, install: undefined, pack: undefined, code: 'pack.mixed-packs' });
    assert.deepEqual(
      phone.kernel.journal.read(before).map((entry) => entry.type),
      ['Failure'],
      'a plan that mixes audio with text starts nothing',
    );

    assert.ok((await phone.kernel.packs.remove(language)).ok);
    assert.deepEqual(
      phone.kernel.packs.installed().map((pack) => pack.pack),
      [audio],
      'removing the language pack leaves its audio',
    );
  },
);
