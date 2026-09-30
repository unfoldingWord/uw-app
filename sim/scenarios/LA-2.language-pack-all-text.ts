import assert from 'node:assert/strict';
import { languagePackId } from '@lib/domain/pack';
import { burritoRootOf } from '../install';
import { scenario } from '../scenario';
import { servicesOf } from '../services';

const textRows = [
  'articles',
  'articles',
  'notes',
  'questions',
  'stories',
  'storyHelps',
  'storyHelps',
  'storyHelps',
  'text',
  'text',
  'wordLinks',
];

export default scenario(
  'LA-2',
  'the language pack is every text resource of a language, installed in one action',
  async (world) => {
    const phone = world.device('phone');
    await phone.start();
    await phone.kernel.catalog.refresh();

    const publishers = phone.kernel.catalog
      .releases('qaa')
      .filter((release) => release.resource === 'qaa_obs' && release.row === 'stories')
      .map((release) => release.publisher);
    assert.deepEqual(publishers, ['unfoldingWord', 'Door43-Catalog'], 'unfoldingWord is listed first');

    const pack = languagePackId('qaa');
    const texts = (await phone.kernel.packs.defaults(pack))
      .filter((release) => release.row === 'text')
      .map((release) => `${release.publisher}/${release.resource}`);
    assert.deepEqual(
      texts,
      ['unfoldingWord/qaa_ult', 'unfoldingWord/qaa_ust'],
      "the default pack holds the publisher's own literal and simplified pair only",
    );
    const services = servicesOf(phone);
    await services.languages.select('qaa');
    const more = services.languages.more();
    assert.deepEqual(
      more.map((item) => `${item.release.publisher}/${item.release.resource}`),
      ['unfoldingWord/qaa_obs-tf', 'unfoldingWord/qaa_t4t', 'Door43-Catalog/qaa_obs', 'Worldview/qaa_bsb'],
      'other texts, other publishers and formation are optional downloads',
    );
    assert.ok(
      more.every((item) => item.detail.includes(item.release.publisher)),
      'each optional download shows its publisher',
    );

    const outcome = await phone.kernel.packs.installFromCatalog(pack);
    assert.ok(outcome.ok, outcome.ok ? '' : outcome.code);

    const [installed] = phone.kernel.packs.installed();
    assert.equal(installed?.pack, pack);
    assert.deepEqual(installed.burritos.map((burrito) => burrito.row).sort(), textRows);
    assert.ok(installed.burritos.every((burrito) => burrito.provenance.publisher === 'unfoldingWord'));
    assert.ok(
      installed.burritos.every((burrito) => burrito.provenance.licence.includes('CC BY-SA 4.0')),
      'every burrito carries its licence',
    );
    assert.ok(
      !installed.burritos.some((burrito) => ['audio', 'images'].includes(burrito.row)),
      'audio and images are never part of the language pack',
    );

    const types = phone.kernel.journal.read().map((entry) => entry.type);
    assert.equal(types.filter((type) => type === 'PackInstallStarted').length, 1, 'one action');
    assert.equal(types.filter((type) => type === 'PackInstalled').length, 1);
    assert.ok(types.filter((type) => type === 'PackInstallProgressed').length <= 10);

    const tree = phone.adapters.files.tree();
    assert.ok(tree.includes(`${burritoRootOf(phone, 'qaa_ult')}/metadata.json`));
    assert.ok(tree.includes(`${burritoRootOf(phone, 'qaa_tn')}/ingredients/RUT.tsv`));
    assert.ok(
      !tree.some((path) => /README|\.github|\.gitignore/.test(path)),
      'only the burrito is kept from the archive',
    );
    assert.ok(!tree.some((path) => path.startsWith('packs/.staging') || path.startsWith('packs/.old')));

    const status = await phone.kernel.packs.status('qaa');
    assert.equal(status.complete, true);
    assert.equal(status.missing.length, 0);

    const bsb = more.find((item) => item.release.resource === 'qaa_bsb');
    assert.ok(bsb !== undefined);
    const optional = await services.languages.installMore(bsb);
    assert.ok(optional.ok, optional.ok ? '' : optional.code);
    assert.ok(
      phone.kernel.packs
        .installed()[0]
        ?.burritos.some((burrito) => burrito.provenance.publisher === 'Worldview'),
      'an optional download joins the language pack when the leader chooses it',
    );
    assert.equal(
      services.languages.more().find((item) => item.release.resource === 'qaa_bsb')?.installed,
      true,
    );
    assert.equal((await phone.kernel.packs.status('qaa')).complete, true);
  },
);
