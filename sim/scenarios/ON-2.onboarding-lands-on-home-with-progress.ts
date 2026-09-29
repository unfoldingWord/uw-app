import assert from 'node:assert/strict';
import { languagePackId } from '@lib/domain/pack';
import { scenario } from '../scenario';
import { servicesOf } from '../services';
import { until } from '../wait';

export default scenario(
  'ON-2',
  'choosing a language in onboarding makes it the content language, starts its pack and shows progress on Home',
  async (world) => {
    const phone = world.device('phone');
    await phone.start();
    const { onboarding, home } = servicesOf(phone);
    assert.ok((await onboarding.refresh()).ok);
    assert.deepEqual(
      onboarding.languages().map((choice) => [choice.language, choice.autonym]),
      [
        ['en', 'English'],
        ['qaa', 'Fixture A'],
        ['qab', 'Fixture B'],
      ],
    );

    const release = phone.adapters.http.hold('https://git.door43.org/unfoldingWord/qaa_');
    const chosen = await onboarding.choose('qaa');
    assert.equal(chosen.pack, languagePackId('qaa'));
    assert.equal(onboarding.needed(), false, 'onboarding is done as soon as a language is chosen');
    assert.equal(home.header().language?.language, 'qaa');

    await until(() => phone.kernel.packs.installing().length > 0);
    const during = await home.download();
    assert.equal(during.state, 'installing');
    assert.equal(during.state === 'installing' && during.progress.total, 12);

    release();
    const outcome = await chosen.done;
    assert.ok(outcome.ok);
    const after = await home.download();
    assert.equal(after.state, 'complete');
    assert.equal(after.state === 'complete' && after.resources, 12);

    const english = world.device('english');
    await english.start();
    const services = servicesOf(english);
    await services.onboarding.refresh();
    const continued = await services.onboarding.continueInEnglish();
    assert.equal(continued.pack, languagePackId('en'));
    assert.ok((await continued.done).ok);
    assert.equal(services.home.header().language?.language, 'en');
  },
);
