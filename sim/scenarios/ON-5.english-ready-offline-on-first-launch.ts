import assert from 'node:assert/strict';
import { imagePackId, languagePackId } from '@lib/domain/pack';
import { parseReference } from '@lib/domain/reference';
import type { DomainEvent } from '@lib/domain/events';
import { fixtureBundle } from '../bundled';
import type { SimDevice } from '../device';
import { scenario } from '../scenario';
import { servicesOf } from '../services';

const ruth = parseReference('RUT 1:16');

function bundledStarts(device: SimDevice): DomainEvent[] {
  return device.kernel.journal
    .read()
    .filter((entry) => entry.type === 'PackInstallStarted' && entry.payload.source === 'bundled');
}

export default scenario(
  'ON-5',
  'a fresh install reads the language it carries, the stories and their pictures offline, with no download',
  async (world) => {
    const phone = world.device('phone', { bundled: await fixtureBundle('qaa') });
    await phone.start();
    phone.adapters.http.setOnline(false);
    assert.deepEqual(phone.kernel.packs.bundled(), [languagePackId('qaa'), imagePackId]);

    const first = phone.kernel.packs.placeBundled();
    assert.equal(phone.kernel.packs.placeBundled(), first, 'a second call while placing joins the first');
    const outcomes = await first;
    assert.deepEqual(
      outcomes.map((outcome) => (outcome.ok ? outcome.pack.pack : outcome.code)),
      [languagePackId('qaa'), imagePackId],
    );
    assert.deepEqual(phone.adapters.http.requests(), [], 'nothing was downloaded');
    assert.equal(bundledStarts(phone).length, 2);
    const installed = phone.kernel.packs.installed();
    assert.ok(
      installed.every(
        (pack) => pack.source === 'bundled' && pack.burritos.every((b) => b.source === 'bundled'),
      ),
      'every burrito records that it came with the app',
    );
    assert.deepEqual(phone.kernel.telemetry.counts().languagePackDownloads, {}, 'placing is not a download');

    assert.ok(ruth.ok);
    const passage = await phone.kernel.corpus.passage(ruth.reference, { language: 'qaa' });
    assert.ok((passage?.text.verses.length ?? 0) > 0, 'the text reads offline');
    assert.ok((passage?.notes.length ?? 0) > 0, 'the helps read offline');
    assert.equal(passage?.text.provenance.resource, 'qaa_ult');
    const story = await phone.kernel.corpus.story(1, 'qaa');
    const pictured = story?.frames.filter((frame) => frame.image !== undefined) ?? [];
    assert.ok(pictured.length > 0, 'the stories read offline with their pictures');
    assert.ok(
      pictured.every((frame) => phone.kernel.media.uriOf(frame.image?.path ?? '') !== undefined),
      'every picture is a file on the phone',
    );

    const services = servicesOf(phone);
    const chosen = await services.onboarding.choose('qaa');
    const done = await chosen.done;
    assert.ok(done.ok, done.ok ? '' : done.code);
    assert.equal(services.formation.pictures(), 'on-phone');
    const card = await services.home.download();
    assert.equal(card.state, 'complete', 'Home shows the language ready offline');
    assert.deepEqual(phone.adapters.http.requests(), [], 'onboarding asked for nothing');

    assert.deepEqual(await phone.kernel.packs.placeBundled(), [], 'placing again does nothing');
    await phone.restart();
    assert.deepEqual(await phone.kernel.packs.placeBundled(), [], 'nor on the next start');
    assert.equal(bundledStarts(phone).length, 2);

    const english = world.device('english', { bundled: await fixtureBundle('en') });
    await english.start();
    english.adapters.http.setOnline(false);
    const fresh = servicesOf(english);
    const continued = await fresh.onboarding.continueInEnglish();
    const ready = await continued.done;
    assert.ok(ready.ok, ready.ok ? '' : ready.code);
    assert.ok((await continued.pictures)?.ok, 'the pictures came with the app too');
    assert.deepEqual(english.adapters.http.requests(), [], 'Continue in English downloads nothing');
    const englishStory = await english.kernel.corpus.story(1, 'en');
    assert.ok((englishStory?.frames.length ?? 0) > 0, 'English stories read offline');
    assert.ok(englishStory?.frames.some((frame) => frame.image !== undefined));

    const replayed = world.device('replayed', { bundled: await fixtureBundle('qaa') });
    await replayed.start();
    replayed.adapters.http.setOnline(false);
    for (const event of bundledStarts(phone)) {
      assert.equal(await replayed.kernel.redo(event), 'redone');
    }
    assert.deepEqual(
      replayed.kernel.snapshot().modules.packs,
      phone.kernel.snapshot().modules.packs,
      'a journaled placement replays from what the app carries',
    );
  },
);
