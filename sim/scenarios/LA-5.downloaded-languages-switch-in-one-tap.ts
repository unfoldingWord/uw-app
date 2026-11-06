import assert from 'node:assert/strict';
import { languagePackId } from '@lib/domain/pack';
import { scenario } from '../scenario';
import { servicesOf } from '../services';

export default scenario(
  'LA-5',
  'the languages on this phone are listed apart from the whole catalog, and one tap switches between them',
  async (world) => {
    const phone = world.device('phone');
    await phone.start();
    const languages = servicesOf(phone).languages;
    await phone.kernel.catalog.refresh();
    assert.deepEqual(languages.downloaded(), [], 'nothing downloaded means no short list');

    for (const language of ['qaa', 'qab']) {
      assert.ok((await phone.kernel.packs.installFromCatalog(languagePackId(language))).ok);
    }
    assert.ok(await languages.select('qaa'));
    assert.deepEqual(languages.downloaded(), [
      {
        language: 'qaa',
        autonym: 'Fixture A',
        englishName: 'Fixture language A',
        resources: '11 resources',
        show: 'See the resources of Fixture A on this phone',
        selected: true,
      },
      {
        language: 'qab',
        autonym: 'Fixture B',
        englishName: 'Fixture language B',
        resources: '2 resources',
        show: 'See the resources of Fixture B on this phone',
        selected: false,
      },
    ]);
    assert.ok(
      !languages.downloaded().some((item) => item.language === 'en'),
      'a language only in the catalog is not in the short list',
    );

    assert.ok(await languages.select('qab'));
    assert.equal(languages.current(), 'qab', 'one tap switches the active language');
    assert.deepEqual(
      languages.downloaded().map((item) => [item.language, item.selected]),
      [
        ['qaa', false],
        ['qab', true],
      ],
    );
    assert.deepEqual(
      phone.kernel.packs.installing(),
      [],
      'switching to a downloaded language downloads nothing',
    );

    await phone.restart();
    const restarted = servicesOf(phone).languages;
    assert.deepEqual(
      restarted.downloaded().map((item) => item.language),
      ['qaa', 'qab'],
      'the short list is read from this phone after a restart',
    );
    assert.ok((await phone.kernel.packs.remove(languagePackId('qab'))).ok);
    assert.deepEqual(
      restarted.downloaded().map((item) => item.language),
      ['qaa'],
      'a removed language leaves the short list',
    );
  },
);
