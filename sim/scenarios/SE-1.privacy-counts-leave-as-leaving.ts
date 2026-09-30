import assert from 'node:assert/strict';
import { languagePackId } from '@lib/domain/pack';
import { contentHosts, hostOf } from '@lib/network';
import { installFromCatalog } from '../install';
import { replayJournal } from '../replay';
import { scenario } from '../scenario';
import { servicesOf } from '../services';

const endpoint = 'https://counts.sim.invalid/batch';

function decoded(body: Uint8Array | undefined): unknown {
  return JSON.parse(new TextDecoder().decode(body ?? new Uint8Array()));
}

export default scenario(
  'SE-1',
  'with no endpoint set nothing is sent and the privacy screen says so; with one set the only request is a batch that is exactly leaving(), once a day when online, kept for the next day when it fails',
  async (world) => {
    const quiet = world.device('quiet');
    await quiet.start();
    await installFromCatalog(quiet, [languagePackId('qaa')]);
    assert.equal(quiet.kernel.telemetry.sending(), false);
    assert.deepEqual(await quiet.kernel.telemetry.send(), { sent: false, reason: 'off' });
    assert.ok(
      quiet.adapters.http.sent().every((request) => contentHosts.includes(hostOf(request.url) ?? '')),
      'no request leaves for anything but content while the endpoint is unset',
    );
    assert.ok(quiet.adapters.http.sent().every((request) => request.method !== 'POST'));
    const off = servicesOf(quiet).settings.privacy();
    const words = quiet.kernel.strings.words('en');
    assert.equal(off.summary, words.t('privacy.summary'));
    assert.equal(off.intro, words.t('privacy.counts'), 'the privacy screen says nothing is sent yet');

    world.network.serve(endpoint, { status: 204, body: '' });
    const phone = world.device('phone', { telemetryEndpoint: endpoint });
    await phone.start();
    await installFromCatalog(phone, [languagePackId('qaa')]);
    assert.equal(phone.kernel.telemetry.sending(), true);
    const posts = () => phone.adapters.http.sent().filter((request) => request.method === 'POST');

    phone.adapters.http.setOnline(false);
    assert.deepEqual(await phone.kernel.telemetry.send(), { sent: false, reason: 'offline' });
    assert.deepEqual(posts(), [], 'offline, nothing is attempted');
    phone.adapters.http.setOnline(true);

    const leaving = phone.kernel.telemetry.leaving();
    const first = await phone.kernel.telemetry.send();
    assert.deepEqual(first, { sent: true, batch: leaving });
    const [batch] = posts();
    assert.ok(batch);
    assert.equal(batch.url, endpoint);
    assert.deepEqual(batch.headers, { 'content-type': 'application/json' }, 'no header names the phone');
    assert.deepEqual(decoded(batch.body), leaving, 'the payload is exactly leaving()');
    const text = new TextDecoder().decode(batch.body);
    for (const identifying of ['id-', 'phone', '2026-', 'en-', 'UTC', 'ios', 'android']) {
      assert.equal(text.includes(identifying), false, `the payload carries no ${identifying}`);
    }
    assert.equal(phone.kernel.journal.read().at(-1)?.type, 'TelemetrySent');

    assert.deepEqual(await phone.kernel.telemetry.send(), { sent: false, reason: 'sent-today' });
    assert.equal(posts().length, 1, 'one batch a day');

    world.clock.advanceDays(1);
    assert.ok(await phone.kernel.resume());
    phone.adapters.http.script(endpoint, { status: 503 });
    const refused = await phone.kernel.telemetry.send();
    assert.deepEqual(refused, { sent: false, reason: 'failed', code: 'http.status' });
    const failure = phone.kernel.journal.read().at(-1);
    assert.ok(failure?.type === 'Failure');
    assert.deepEqual(failure.payload, { code: 'http.status', context: { step: 'telemetry', status: 503 } });

    world.clock.advanceDays(1);
    assert.ok(await phone.kernel.resume());
    const kept = await phone.kernel.telemetry.send();
    const expected = { ...leaving, appOpens: 2, languagePackDownloads: {}, formationSessionsStarted: {} };
    assert.deepEqual(kept, { sent: true, batch: expected }, 'a failed batch waits for the next day');
    assert.deepEqual(decoded(posts().at(-1)?.body), expected);
    assert.equal(posts().length, 3);

    const on = servicesOf(phone).settings.privacy();
    assert.equal(on.summary, words.t('privacy.summary.sending'));
    assert.equal(on.intro, words.t('privacy.counts.sending'));
    assert.deepEqual(
      on.counts.map((count) => count.fold),
      Object.keys(leaving),
      'the screen lists exactly what is sent',
    );

    await phone.restart();
    assert.deepEqual(await phone.kernel.telemetry.send(), { sent: false, reason: 'sent-today' });
    const replayed = await replayJournal(
      world,
      JSON.parse(JSON.stringify(phone.kernel.journal.export())) as unknown,
      'replayed',
    );
    assert.ok(replayed.ok, replayed.ok ? '' : replayed.reason);
    assert.equal(
      replayed.device.adapters.http.sent().some((request) => request.method === 'POST'),
      false,
      'a replay never sends',
    );
    assert.deepEqual(replayed.device.kernel.telemetry.leaving(), phone.kernel.telemetry.leaving());
  },
);
