import assert from 'node:assert/strict';
import { languagePackId } from '@lib/domain/pack';
import { scenario } from '../scenario';

const languagesListUrl = 'https://git.door43.org/api/v1/catalog/list/languages';

export default scenario(
  'LA-1',
  'the languages list shows every language with content, with autonym, English name, count and an offline badge, and is searchable',
  async (world) => {
    const phone = world.device('phone');
    await phone.start();
    assert.deepEqual(phone.kernel.catalog.languages(), [], 'nothing is listed before the first refresh');

    const refreshed = await phone.kernel.catalog.refresh();
    assert.ok(refreshed.ok);
    const listed = phone.kernel.catalog.languages();
    assert.deepEqual(
      listed.map((item) => item.language),
      ['en', 'qaa', 'qab'],
      'originals and the image pack language are not languages a leader reads in',
    );
    assert.deepEqual(listed[0], {
      language: 'en',
      autonym: 'English',
      englishName: 'English',
      direction: 'ltr',
      resources: 2,
      installed: false,
    });
    const qaa = listed.find((item) => item.language === 'qaa');
    assert.equal(qaa?.autonym, 'Fixture A');
    assert.equal(
      qaa?.englishName,
      'Fixture language A',
      'the English name comes from the DCS languages list, not the two-letter table',
    );
    assert.equal(listed.find((item) => item.language === 'qab')?.englishName, 'Fixture language B');
    assert.equal(qaa?.resources, 14, 'one per resource, however many publishers release it');
    assert.deepEqual(
      phone.kernel.catalog.originals().map((release) => release.language),
      ['el-x-koine', 'hbo'],
    );

    const installed = await phone.kernel.packs.installFromCatalog(languagePackId('qab'));
    assert.ok(installed.ok);
    assert.deepEqual(
      phone.kernel.catalog.languages().map((item) => [item.language, item.installed]),
      [
        ['en', false],
        ['qaa', false],
        ['qab', true],
      ],
      'the offline badge follows the installed language pack',
    );

    const search = (query: string) => phone.kernel.catalog.search(query).map((item) => item.language);
    assert.deepEqual(search('fixture'), ['qaa', 'qab']);
    assert.deepEqual(search('  ENGL '), ['en']);
    assert.deepEqual(search('qab'), ['qab']);
    assert.deepEqual(search('Fixture B'), ['qab']);
    assert.deepEqual(search('language a'), ['qaa']);
    assert.deepEqual(search('xyz'), []);
    assert.deepEqual(search(''), ['en', 'qaa', 'qab']);

    phone.adapters.http.setOnline(false);
    await phone.restart();
    assert.deepEqual(
      phone.kernel.catalog.languages().map((item) => [item.language, item.installed]),
      [
        ['en', false],
        ['qaa', false],
        ['qab', true],
      ],
      'the catalog and the badge survive a restart with no connection',
    );
    const offline = await phone.kernel.catalog.refresh();
    assert.deepEqual(offline, { ok: false, code: 'http.offline' });
    const failure = phone.kernel.journal.read().at(-1);
    assert.equal(failure?.type, 'Failure');
    assert.equal(failure?.type === 'Failure' && failure.payload.code, 'http.offline');
    assert.equal(phone.kernel.catalog.languages().length, 3, 'a failed refresh keeps the known catalog');
    assert.equal(
      phone.kernel.catalog.languages().find((item) => item.language === 'qaa')?.englishName,
      'Fixture language A',
      'the English names are kept on the phone for offline use',
    );
    assert.deepEqual(phone.kernel.snapshot().modules.catalog, {
      releases: 24,
      languages: [
        { language: 'en', resources: 2, installed: false },
        { language: 'qaa', resources: 14, installed: false },
        { language: 'qab', resources: 2, installed: true },
      ],
      originals: ['el-x-koine', 'hbo'],
    });

    const unnamed = world.device('unnamed');
    await unnamed.start();
    unnamed.adapters.http.script(languagesListUrl, { status: 500 }, 1);
    assert.ok(
      (await unnamed.kernel.catalog.refresh()).ok,
      'a failed languages list does not fail the refresh',
    );
    assert.deepEqual(
      unnamed.kernel.catalog.languages().map((item) => [item.language, item.englishName]),
      [
        ['en', 'English'],
        ['qaa', 'Fixture A'],
        ['qab', 'Fixture B'],
      ],
      'without the list, the table names what it can and the autonym stands in',
    );
  },
);
