import assert from 'node:assert/strict';
import { audioPackId, languagePackId } from '@lib/domain/pack';
import { parseReference, type Reference } from '@lib/domain/reference';
import { installFromCatalog } from '../install';
import { scenario } from '../scenario';
import { servicesOf } from '../services';

function reference(text: string): Reference {
  const parsed = parseReference(text);
  if (!parsed.ok) {
    throw new Error(`${text} is not a reference`);
  }
  return parsed.reference;
}

export default scenario(
  'ST-4',
  'the passage offers its chapter audio once the audio pack is downloaded, and plays, pauses and seeks it offline',
  async (world) => {
    const device = world.device('phone');
    await device.start();
    await installFromCatalog(device, [languagePackId('qaa')]);
    const corpus = device.kernel.corpus;

    const silent = await corpus.passage(reference('RUT 1:16'), { language: 'qaa' });
    assert.deepEqual(silent?.audio, [], 'no audio bar before the audio pack is downloaded');

    const audioPack = audioPackId('qaa', 'qaa_ult');
    await installFromCatalog(device, [audioPack]);
    const ruth = await corpus.passage(reference('RUT 1:16'), { language: 'qaa' });
    assert.equal(ruth?.audio.length, 1);
    const [clip] = ruth?.audio ?? [];
    assert.ok(clip);
    assert.equal(clip.book, 'RUT');
    assert.equal(clip.chapter, 1);
    assert.equal(clip.mimeType, 'audio/mp4');
    assert.equal(clip.provenance.resource, 'qaa_ult');
    assert.match(clip.provenance.licence, /CC BY-SA 4\.0/);
    assert.ok(await device.adapters.files.exists(clip.path), `${clip.path} is on the device`);

    const letter = await corpus.passage(reference('3JN 1:1'), { language: 'qaa' });
    assert.deepEqual(letter?.audio, [], 'a chapter the audio pack does not carry has no audio');

    const contents = await corpus.contents('qaa');
    assert.deepEqual(contents.audio, [{ book: 'RUT', chapter: 1 }]);

    assert.ok((await device.kernel.packs.remove(audioPack)).ok);
    const dropped = await corpus.passage(reference('RUT 1:16'), { language: 'qaa' });
    assert.deepEqual(dropped?.audio, [], 'removing the audio pack removes the audio bar');

    const listener = world.device('listener');
    await listener.start();
    const services = servicesOf(listener);
    await services.onboarding.refresh();
    assert.ok((await (await services.onboarding.choose('qaa')).done).ok);

    const before = await services.study.passage('RUT 1:16');
    assert.ok(before.state === 'passage');
    assert.ok(before.view.audio.state === 'not-downloaded', 'the audio bar offers the download first');
    assert.equal(before.view.audio.pack, audioPack);
    assert.ok((await services.study.download(before.view.audio.pack)).ok);

    const after = await services.study.passage('RUT 1:16');
    assert.ok(after.state === 'passage' && after.view.audio.state === 'on-phone');
    const uncovered = await services.study.passage('3JN 1:1');
    assert.deepEqual(
      uncovered.state === 'passage' && uncovered.view.audio,
      { state: 'no-chapter', label: '3 John 1 · audio', detail: 'This chapter has no audio.' },
      'with the pack on the phone, a chapter it does not carry says so in place and never offers a download',
    );
    const onPhone = after.view.audio.clip;
    listener.adapters.audio.provide({ kind: 'file', path: onPhone.path }, 90_000);

    const audio = services.study.listen(onPhone);
    const seen: string[] = [];
    const unsubscribe = audio.subscribe((status) => seen.push(status.state));
    assert.deepEqual(audio.status(), { state: 'idle' });
    const journalBefore = listener.kernel.journal.read().at(-1)?.seq ?? 0;
    const since = () => listener.kernel.journal.read().filter((entry) => entry.seq > journalBefore);

    const playing = await audio.toggle();
    assert.equal(playing.state, 'playing');
    world.clock.advance(20_000);
    const twenty = audio.status();
    assert.ok(twenty.state === 'playing' && twenty.positionMs === 20_000 && twenty.durationMs === 90_000);
    assert.equal(services.study.audioTime(twenty), '0:20 / 1:30');

    const paused = await audio.toggle();
    assert.ok(paused.state === 'paused' && paused.positionMs === 20_000);
    world.clock.advance(5_000);
    assert.ok(audio.status().state === 'paused');
    const ahead = await audio.skip(10_000);
    assert.ok(ahead.state === 'paused' && ahead.positionMs === 30_000, 'ten seconds ahead');
    const back = await audio.skip(-45_000);
    assert.ok(back.state === 'paused' && back.positionMs === 0, 'back stops at the start');
    const near = await audio.seek(85_000);
    assert.ok(near.state === 'paused' && near.positionMs === 85_000);

    await audio.toggle();
    world.clock.advance(10_000);
    const ended = audio.status();
    assert.ok(ended.state === 'ended' && ended.positionMs === 90_000, 'the clip ends at its duration');
    const again = await audio.toggle();
    assert.ok(again.state === 'playing' && again.positionMs === 0, 'play after the end starts over');

    assert.deepEqual(since(), [], 'playing, pausing and seeking keep the journal lean');

    assert.deepEqual(await audio.stop(), { state: 'idle' });
    await listener.adapters.files.remove(onPhone.path);
    const gone = await audio.toggle();
    assert.ok(gone.state === 'failed' && gone.code === 'audio.unavailable', 'a missing file fails in place');
    const failures = since().flatMap((entry) => (entry.type === 'Failure' ? [entry.payload] : []));
    assert.deepEqual(failures, [{ code: 'audio.unavailable', context: { step: 'audio' } }]);

    unsubscribe();
    assert.deepEqual(seen, [
      'loading',
      'paused',
      'playing',
      'paused',
      'paused',
      'paused',
      'paused',
      'playing',
      'ended',
      'loading',
      'playing',
      'idle',
      'loading',
      'failed',
    ]);
  },
);
