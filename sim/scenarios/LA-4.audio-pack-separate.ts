import assert from 'node:assert/strict';
import { audioPackId, languagePackId } from '@lib/domain/pack';
import { admittedRows } from '@lib/burrito/flavors';
import { validate } from '@lib/burrito/validate';
import { fromCatalog } from '@lib/packs/source';
import { readBurrito } from '@lib/packs/tree';
import { scenario } from '../scenario';

export default scenario(
  'LA-4',
  'audio is a separate download per resource per language, never part of the language pack',
  async (world) => {
    const phone = world.device('phone');
    await phone.start();
    await phone.kernel.catalog.refresh();
    const language = languagePackId('qaa');
    const audio = audioPackId('qaa', 'qaa_ult');
    const audioRelease = phone.kernel.catalog
      .releases('qaa')
      .find((release) => release.row === 'audio' && release.resource === 'qaa_ult');
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
      [`packs/audio/qaa/qaa_ult/${outcome.install ?? ''}/unfoldingWord/qaa_ult`],
    );
    const root = installedAudio.burritos[0]?.root ?? '';
    assert.ok(
      phone.adapters.files.tree().includes(`${root}/ingredients/RUT/RUT_001.m4a`),
      'the chapter asset is written into the burrito the app builds, keyed by book and chapter',
    );
    const report = validate(await readBurrito(phone.adapters.files, root), { rows: admittedRows });
    assert.ok(report.ok && report.row.id === 'audio' && report.row.status === 'app-written');
    assert.equal(report.metadata.ingredients['ingredients/RUT/RUT_001.m4a']?.mimeType, 'audio/mp4');

    const stories = audioPackId('qaa', 'qaa_obs');
    const told = await phone.kernel.packs.installFromCatalog(stories);
    assert.ok(told.ok, told.ok ? '' : told.code);
    const storyRoot = told.pack.burritos[0]?.root ?? '';
    const storyReport = validate(await readBurrito(phone.adapters.files, storyRoot), { rows: admittedRows });
    assert.ok(storyReport.ok);
    assert.deepEqual(
      Object.entries(storyReport.metadata.ingredients)
        .filter(([, entry]) => entry.mimeType.startsWith('audio/'))
        .map(([key, entry]) => [key, entry.scope]),
      [['ingredients/OBS/OBS_01.m4a', { OBS: ['1'] }]],
      'story audio is keyed by story, one asset per story',
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
      [stories, audio],
      'removing the language pack leaves its audio',
    );
  },
);
