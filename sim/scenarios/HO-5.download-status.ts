import assert from 'node:assert/strict';
import { languagePackId } from '@lib/domain/pack';
import { fromCatalog } from '@lib/packs/source';
import { scenario } from '../scenario';
import { servicesOf } from '../services';

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
      missing: 12,
      online: true,
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
      missing: 10,
      online: true,
    });

    const completed = await services.home.completeDownload();
    assert.ok(completed?.ok);
    assert.deepEqual(await services.home.download(), {
      state: 'complete',
      language: 'qaa',
      pack: languagePackId('qaa'),
      resources: 12,
      label: '12 resources ready offline in Fixture A',
    });

    phone.adapters.http.setOnline(false);
    await services.languages.select('qab');
    const offline = await services.home.download();
    assert.equal(offline.state, 'none');
    assert.equal(
      offline.state === 'none' && offline.online,
      false,
      'offline, the card says the download waits',
    );
  },
);
