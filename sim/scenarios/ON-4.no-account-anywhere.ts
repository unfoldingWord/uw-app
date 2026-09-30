import assert from 'node:assert/strict';
import { hostOf } from '@lib/network';
import { preferenceKeys } from '@lib/domain/preferences';
import { imagePackId } from '@lib/domain/pack';
import { scenario } from '../scenario';
import { localTime, servicesOf } from '../services';

const accountWords = /account|sign.?in|log.?in|password|email|e-mail|phone.?number|credential|token|auth/i;

export default scenario(
  'ON-4',
  'no account, sign-in, email or phone number is asked for or sent anywhere, and no request carries credentials',
  async (world) => {
    const phone = world.device('phone', { locale: { tag: 'en-US', region: 'US' } });
    await phone.start();
    const services = servicesOf(phone);
    await services.onboarding.refresh();
    assert.ok((await (await services.onboarding.choose('qaa', { name: 'Jesse' })).done).ok);
    assert.ok((await services.languages.downloadImages()).ok);
    await services.study.open();
    await services.home.refreshStories();
    services.home.invitation(localTime(phone).at);

    const surfaces = Object.entries(services).flatMap(([feature, service]) =>
      Object.keys(service).map((name) => `${feature}.${name}`),
    );
    assert.deepEqual(
      surfaces.filter((name) => accountWords.test(name)),
      [],
      'no feature offers an account, a sign-in or a contact field',
    );
    assert.deepEqual(
      preferenceKeys.filter((key) => accountWords.test(key)),
      [],
      'no preference holds an account, an email or a phone number',
    );
    assert.deepEqual(
      (await phone.adapters.kv.keys()).filter((key) => accountWords.test(key)),
      [],
    );

    const sent = phone.adapters.http.sent();
    assert.ok(sent.length > 0);
    assert.deepEqual(
      [...new Set(sent.map((request) => hostOf(request.url)))].sort(),
      ['cdn.door43.org', 'git.door43.org', 'unfoldingword.org'],
      'the only hosts are the catalog, its downloads, the story pictures and unfoldingWord',
    );
    assert.deepEqual(
      sent.filter(
        (request) =>
          Object.keys(request.headers).some((header) => /authorization|cookie|token|api-key/i.test(header)) ||
          accountWords.test(new URL(request.url).search),
      ),
      [],
      'no request carries a credential',
    );
    assert.ok(phone.kernel.packs.installed().some((pack) => pack.pack === imagePackId));
  },
);
