import assert from 'node:assert/strict';
import { imagePackId, languagePackId } from '@lib/domain/pack';
import type { SimDevice } from '../device';
import { scenario } from '../scenario';
import { servicesOf } from '../services';
import { until } from '../wait';

const cdn = 'https://cdn.door43.org/obs/jpg/360px/';

function imageStarts(device: SimDevice): number {
  return device.kernel.journal
    .read()
    .filter((entry) => entry.type === 'PackInstallStarted' && entry.payload.pack === imagePackId).length;
}

function hasPictures(device: SimDevice): boolean {
  return device.kernel.packs.installed().some((pack) => pack.pack === imagePackId);
}

export default scenario(
  'LA-3',
  'the first language brings the story pictures with it, once, and a picture failure never sinks the language',
  async (world) => {
    const phone = world.device('phone');
    await phone.start();
    const services = servicesOf(phone);
    assert.ok((await services.onboarding.refresh()).ok);
    assert.match(
      services.languages.list().find((row) => row.language === 'qaa')?.detail ?? '',
      /^Fixture language A · 11 resources · about 31 MB with story pictures$/,
      'the size the leader agrees to includes the pictures that come with the first language',
    );

    const held = phone.adapters.http.hold(cdn);
    const chosen = await services.onboarding.choose('qaa');
    const language = await chosen.done;
    assert.ok(language.ok, language.ok ? '' : language.code);
    await until(() => phone.kernel.packs.installing().some((item) => item.pack === imagePackId));
    const during = await services.home.download();
    assert.equal(during.state, 'installing', 'Home keeps showing progress while the pictures arrive');
    assert.equal(during.state === 'installing' && during.pack, imagePackId);
    assert.equal(during.state === 'installing' && during.label, 'Downloading story pictures');
    held();
    const pictures = await chosen.pictures;
    assert.ok(pictures?.ok, 'the Image Pack installs with the first language');
    assert.equal(services.formation.pictures(), 'on-phone');
    assert.equal((await services.home.download()).state, 'complete');

    assert.match(
      services.languages.list().find((row) => row.language === 'qab')?.detail ?? '',
      /^Fixture language B · 2 resources · about \d+(\.\d+)? KB$/,
      'a later language states its own size only',
    );
    assert.ok((await services.languages.download('qab')).ok);
    await until(() => phone.kernel.packs.installing().length === 0);
    assert.equal(imageStarts(phone), 1, 'a later language does not download the pictures again');

    const removed = world.device('removed');
    await removed.start();
    const away = servicesOf(removed);
    await away.languages.refresh();
    assert.ok((await away.languages.download('qaa')).ok);
    await until(() => hasPictures(removed));
    assert.ok((await away.languages.remove(imagePackId)).ok);
    assert.ok((await away.languages.download('qab')).ok);
    await until(() => removed.kernel.packs.installing().length === 0);
    assert.equal(
      imageStarts(removed),
      1,
      'pictures the leader removed stay removed when a language is added',
    );
    assert.equal(away.formation.pictures(), 'offered', 'the reader still offers the pictures in place');

    const failing = world.device('failing');
    await failing.start();
    const broken = servicesOf(failing);
    await broken.onboarding.refresh();
    failing.adapters.http.script(cdn, { status: 500 });
    const attempt = await broken.onboarding.choose('qaa');
    const text = await attempt.done;
    assert.ok(text.ok, 'the language installs whole');
    const missed = await attempt.pictures;
    assert.equal(missed?.ok, false, 'the pictures fail on their own');
    assert.deepEqual(
      failing.kernel.packs.installed().map((pack) => pack.pack),
      [languagePackId('qaa')],
    );
    assert.equal((await broken.home.download()).state, 'complete');
    assert.equal(broken.formation.pictures(), 'offered', 'the reader offers the pictures in place');
  },
);
