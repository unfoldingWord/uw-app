import assert from 'node:assert/strict';
import { languagePackId } from '@lib/domain/pack';
import { fromCatalog } from '@lib/packs/source';
import { scenario } from '../scenario';
import { servicesOf } from '../services';
import { until } from '../wait';

export default scenario(
  'HO-5',
  'Home shows what of the current language is on the phone, what is missing, and completes it in one tap',
  async (world) => {
    const phone = world.device('phone');
    await phone.start();
    const services = servicesOf(phone);
    assert.deepEqual(await services.home.download(), { state: 'no-language' });

    await services.onboarding.refresh();
    await services.languages.select('qaa');
    assert.deepEqual(await services.home.download(), {
      state: 'none',
      language: 'qaa',
      pack: languagePackId('qaa'),
      missing: 11,
      online: true,
      failure: undefined,
      label: 'Nothing for Fixture A is on this phone yet.',
      detail: '0 of 11 resources on this phone',
    });

    const partial = phone.kernel.catalog
      .releases('qaa')
      .filter(
        (release) =>
          ['qaa_ult', 'qaa_tn'].includes(release.resource) && release.publisher === 'unfoldingWord',
      );
    assert.ok((await phone.kernel.packs.install(fromCatalog(partial), { pack: languagePackId('qaa') })).ok);
    assert.deepEqual(await services.home.download(), {
      state: 'missing',
      language: 'qaa',
      pack: languagePackId('qaa'),
      resources: 2,
      missing: 9,
      online: true,
      failure: undefined,
      label: 'Some resources for Fixture A are not on this phone yet.',
      detail: '2 of 11 resources on this phone',
    });

    const held = phone.adapters.http.hold('https://git.door43.org/unfoldingWord/qaa_');
    const completing = services.home.completeDownload();
    await until(() => phone.kernel.packs.installing().length > 0);
    const installing = await services.home.download();
    assert.equal(installing.state, 'installing');
    if (installing.state === 'installing') {
      assert.equal(installing.label, 'Downloading Fixture A');
      assert.equal(installing.detail, '2 of 11 resources on this phone');
      assert.equal(installing.size, undefined, 'nothing has arrived yet, so no size is claimed');
    }
    held();
    assert.ok((await completing)?.ok);

    const completed = await services.home.completeDownload();
    assert.ok(completed?.ok);
    assert.deepEqual(await services.home.download(), {
      state: 'complete',
      language: 'qaa',
      pack: languagePackId('qaa'),
      resources: 11,
      label: '11 resources ready offline in Fixture A',
    });

    phone.adapters.http.setOnline(false);
    await services.languages.select('qab');
    const offline = await services.home.download();
    assert.equal(offline.state, 'none');
    assert.equal(offline.state === 'none' && offline.online, false, 'offline, the card says what to do');
    assert.equal(
      services.home.words().t('home.download.waiting'),
      'Connect to the internet, then tap to download.',
      'nothing resumes a download by itself, so the copy does not promise it',
    );
  },
);
