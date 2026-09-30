import assert from 'node:assert/strict';
import { imagePackId, languagePackId } from '@lib/domain/pack';
import { validate } from '@lib/burrito/validate';
import { admittedRows } from '@lib/burrito/flavors';
import { readBurrito } from '@lib/packs/tree';
import { burritoRootOf } from '../install';
import { scenario } from '../scenario';
import { servicesOf } from '../services';

const image = 'ingredients/images/obs-en-01-01.jpg';
const cdn = 'https://cdn.door43.org/obs/jpg/360px/';

export default scenario(
  'LA-3',
  'the story images are one shared pack downloaded once, and a language override ships inside its pack',
  async (world) => {
    const phone = world.device('phone');
    await phone.start();
    const languages = servicesOf(phone).languages;
    assert.equal(languages.imagesAvailable(), false, 'the Images row is hidden while the pack has no source');
    await phone.kernel.catalog.refresh();
    assert.equal(languages.imagesAvailable(), true, 'the en_obs release is the Image Pack source');
    for (const pack of [languagePackId('qaa'), languagePackId('qab'), imagePackId]) {
      const outcome = await phone.kernel.packs.installFromCatalog(pack);
      assert.ok(outcome.ok, outcome.ok ? '' : outcome.code);
    }
    const again = await phone.kernel.packs.installFromCatalog(imagePackId);
    assert.ok(again.ok && again.install === undefined, 'a second request downloads nothing');

    const packs = phone.kernel.packs.installed();
    assert.deepEqual(
      packs.map((pack) => [pack.pack, pack.kind]),
      [
        ['image:obs', 'image'],
        ['language:qaa', 'language'],
        ['language:qab', 'language'],
      ],
    );
    const started = phone.kernel.journal.read().filter((entry) => entry.type === 'PackInstallStarted');
    assert.equal(started.filter((entry) => entry.payload.pack === imagePackId).length, 1);

    const imagePack = packs.find((pack) => pack.pack === imagePackId);
    const [built] = imagePack?.burritos ?? [];
    assert.ok(built !== undefined);
    assert.deepEqual(
      [built.row, built.provenance.publisher, built.provenance.resource, built.provenance.tag],
      ['images', 'unfoldingWord', 'en_obs', 'v9'],
      'the app builds the Image Pack with provenance from the en_obs catalog entry',
    );
    assert.match(built.provenance.licence, /CC BY-SA 4\.0/);
    const pictures = phone.adapters.http.requests().filter((request) => request.startsWith(`GET ${cdn}`));
    assert.deepEqual(
      pictures,
      [...new Set(pictures)],
      'each picture the stories cite is fetched from the CDN once',
    );
    assert.ok(pictures.length > 0);
    const report = validate(await readBurrito(phone.adapters.files, built.root), { rows: admittedRows });
    assert.ok(report.ok, report.ok ? '' : report.message);
    assert.equal(report.row.id, 'images');
    assert.equal(report.row.status, 'app-written', 'what the app writes passes the same validator');

    const story = await phone.kernel.corpus.story(1, 'qaa');
    const [first, second] = story?.frames ?? [];
    const languageRoot = burritoRootOf(phone, 'qaa_obs');
    assert.ok(
      first?.image?.path.startsWith(`${languageRoot}/`),
      'frame 1 shows the picture the language overrides, from the language pack',
    );
    assert.ok(
      second?.image?.path.startsWith(`${built.root}/`),
      'frame 2 shows the shared picture, from the Image Pack',
    );

    const files = phone.adapters.files;
    const shared = await files.readBytes(`${built.root}/${image}`);
    const override = await files.readBytes(`${burritoRootOf(phone, 'qaa_obs')}/${image}`);
    assert.notDeepEqual(override, shared, 'qaa overrides one image inside its own stories burrito');
    assert.equal(
      await files.exists(`${burritoRootOf(phone, 'qab_obs')}/${image}`),
      false,
      'qab uses the shared image',
    );
    assert.ok(
      packs
        .filter((pack) => pack.kind === 'language')
        .every((pack) => pack.burritos.every((burrito) => burrito.row !== 'images')),
    );
  },
);
