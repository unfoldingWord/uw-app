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
    assert.equal(during.state === 'installing' && during.progress.total, 11);

    release();
    const outcome = await chosen.done;
    assert.ok(outcome.ok);
    const after = await home.download();
    assert.equal(after.state, 'complete');
    assert.equal(after.state === 'complete' && after.resources, 11);

    const english = world.device('english');
    await english.start();
    const services = servicesOf(english);
    await services.onboarding.refresh();
    const continued = await services.onboarding.continueInEnglish();
    assert.equal(continued.pack, languagePackId('en'));
    assert.ok((await continued.done).ok);
    assert.equal(services.home.header().language?.language, 'en');

    const offline = world.device('offline');
    await offline.start();
    const away = servicesOf(offline);
    assert.ok((await away.onboarding.refresh()).ok);
    offline.adapters.http.setOnline(false);
    const attempted = await away.onboarding.choose('qab');
    const failed = await attempted.done;
    assert.equal(failed.ok, false, 'offline, the pack cannot start');
    assert.equal(!failed.ok && failed.code, 'http.offline');
    const card = await away.home.download();
    assert.equal(card.state, 'none');
    if (card.state === 'none') {
      assert.equal(card.online, false);
      assert.equal(card.failure, 'http.offline', 'Home shows why the pack is not on the phone');
      assert.equal(card.label, 'Nothing for Fixture B is on this phone yet.');
      assert.equal(card.detail, '0 of 2 resources on this phone');
    }
    assert.equal(
      away.home.words().t('home.download.waiting'),
      'Connect to the internet, then tap to download.',
    );

    const cold = world.device('cold');
    await cold.start();
    const unprimed = servicesOf(cold);
    const direct = await unprimed.onboarding.choose('qaa');
    assert.ok((await direct.done).ok, 'a choice before any catalog refresh fetches the catalog first');
    assert.equal((await unprimed.home.download()).state, 'complete');
    assert.equal(unprimed.home.header().language?.autonym, 'Fixture A');

    const coldOffline = world.device('cold-offline');
    await coldOffline.start();
    coldOffline.adapters.http.setOnline(false);
    const stranded = servicesOf(coldOffline);
    const never = await (await stranded.onboarding.choose('qaa')).done;
    assert.equal(!never.ok && never.code, 'http.offline', 'no catalog and no network fails as offline');
    const strandedCard = await stranded.home.download();
    assert.equal(strandedCard.state, 'none');
    if (strandedCard.state === 'none') {
      assert.equal(strandedCard.online, false, 'the card says to connect, then tap');
      assert.equal(strandedCard.detail, undefined, 'no count is claimed while the catalog holds nothing');
    }
  },
);
