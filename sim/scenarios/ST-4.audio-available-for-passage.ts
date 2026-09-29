import assert from 'node:assert/strict';
import { audioPackId, languagePackId } from '@lib/domain/pack';
import { parseReference, type Reference } from '@lib/domain/reference';
import { installFromCatalog } from '../install';
import { scenario } from '../scenario';

function reference(text: string): Reference {
  const parsed = parseReference(text);
  if (!parsed.ok) {
    throw new Error(`${text} is not a reference`);
  }
  return parsed.reference;
}

export default scenario(
  'ST-4',
  'the corpus reports audio for a passage when an audio pack carries its chapter, with the file to play offline',
  async (world) => {
    const device = world.device('phone');
    await device.start();
    await installFromCatalog(device, [languagePackId('qaa')]);
    const corpus = device.kernel.corpus;

    const silent = await corpus.passage(reference('RUT 1:16'), { language: 'qaa' });
    assert.deepEqual(silent?.audio, [], 'no audio bar before the audio pack is downloaded');

    const audioPack = audioPackId('qaa', 'qaa_ult-audio');
    await installFromCatalog(device, [audioPack]);
    const ruth = await corpus.passage(reference('RUT 1:16'), { language: 'qaa' });
    assert.equal(ruth?.audio.length, 1);
    const [clip] = ruth?.audio ?? [];
    assert.ok(clip);
    assert.equal(clip.book, 'RUT');
    assert.equal(clip.chapter, 1);
    assert.equal(clip.mimeType, 'audio/mpeg');
    assert.equal(clip.provenance.resource, 'qaa_ult-audio');
    assert.match(clip.provenance.licence, /CC BY-SA 4\.0/);
    assert.ok(await device.adapters.files.exists(clip.path), `${clip.path} is on the device`);

    const letter = await corpus.passage(reference('3JN 1:1'), { language: 'qaa' });
    assert.deepEqual(letter?.audio, [], 'a chapter the audio pack does not carry has no audio');

    const contents = await corpus.contents('qaa');
    assert.deepEqual(contents.audio, [{ book: 'RUT', chapter: 1 }]);

    await corpus.drop(audioPack);
    const dropped = await corpus.passage(reference('RUT 1:16'), { language: 'qaa' });
    assert.deepEqual(dropped?.audio, [], 'removing the audio pack removes the audio bar');
  },
);
