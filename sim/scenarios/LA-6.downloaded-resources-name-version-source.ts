import assert from 'node:assert/strict';
import { languagePackId } from '@lib/domain/pack';
import { scenario } from '../scenario';
import { servicesOf } from '../services';

export default scenario(
  'LA-6',
  'each downloaded language lists the resources on this phone, each with its name, version and source online',
  async (world) => {
    const phone = world.device('phone');
    await phone.start();
    const languages = servicesOf(phone).languages;
    await phone.kernel.catalog.refresh();
    assert.deepEqual(
      languages.resources('qab'),
      [],
      'a language not downloaded has no resources on this phone',
    );

    assert.ok((await phone.kernel.packs.installFromCatalog(languagePackId('qab'))).ok);
    const listed = languages.resources('qab');
    assert.deepEqual(
      listed.map((item) => [item.title, item.detail]),
      [
        ['Fixture B Open Bible Stories', 'unfoldingWord · v1'],
        ['Fixture B OBS Study Questions', 'unfoldingWord · v1'],
      ],
    );
    const [stories] = listed;
    assert.deepEqual(stories, {
      publisher: 'unfoldingWord',
      resource: 'qab_obs',
      title: 'Fixture B Open Bible Stories',
      detail: 'unfoldingWord · v1',
      version: 'Version v1',
      published: 'Published by unfoldingWord',
      licence: 'Copyright © 2023 by unfoldingWord, CC BY-SA 4.0',
      origin: 'From the catalog',
      source: 'https://git.door43.org/unfoldingWord/qab_obs/releases/tag/v1',
    });
    assert.equal(
      listed.length,
      Number.parseInt(languages.downloaded().find((item) => item.language === 'qab')?.resources ?? '', 10),
      'the count on the short list is the number of resources listed',
    );
    assert.deepEqual(
      languages.resource('qab', 'unfoldingWord', 'qab_obs'),
      stories,
      'details open from the list',
    );
    assert.equal(languages.resource('qab', 'unfoldingWord', 'missing'), undefined);
    assert.equal(languages.resource('qaa', 'unfoldingWord', 'qab_obs'), undefined);

    await phone.restart();
    assert.deepEqual(
      servicesOf(phone).languages.resource('qab', 'unfoldingWord', 'qab_obs'),
      stories,
      'the details come from the provenance stored on this phone, with no connection',
    );
  },
);
