import assert from 'node:assert/strict';
import { languagePackId } from '@lib/domain/pack';
import { installFromCatalog } from '../install';
import { scenario } from '../scenario';
import { servicesOf } from '../services';

export default scenario(
  'FO-5',
  'without the five movements, a session is the plain story with its study questions, and English movements come alongside on request',
  async (world) => {
    const device = world.device('phone');
    await device.start();
    await installFromCatalog(device, [languagePackId('qab')]);
    const formation = device.kernel.formation;

    const plain = await formation.session('foundations', 1, 'qab');
    assert.ok(plain && plain.track === 'foundations');
    assert.equal(plain.story.language, 'qab');
    assert.ok(plain.story.frames[0]?.text.includes('Yahweh'), 'the story is in the local language');
    assert.ok(plain.story.questions.length > 0, 'the study questions come with the story');
    assert.equal(plain.story.questions[0]?.provenance.resource, 'qab_obs-sq');
    assert.deepEqual(plain.movements, { state: 'not-in-language', english: { state: 'off' } });
    assert.deepEqual(plain.outline, ['frames', 'study-questions']);

    const wanting = await formation.session('foundations', 1, 'qab', { englishAlongside: true });
    assert.ok(wanting && wanting.track === 'foundations');
    assert.deepEqual(wanting.movements, {
      state: 'not-in-language',
      english: { state: 'needs-download', language: 'en', pack: 'language:en' },
    });

    const service = servicesOf(device).formation;
    device.adapters.http.setOnline(false);
    assert.deepEqual(
      await service.download('language:en'),
      { ok: false, code: 'http.offline' },
      'offline, the download says why in place',
    );
    device.adapters.http.setOnline(true);
    assert.deepEqual(
      await service.download('language:en'),
      { ok: true },
      'the session offers the English pack in one tap',
    );
    assert.equal(service.languageName('en'), 'English');
    const alongside = await formation.session('foundations', 1, 'qab', { englishAlongside: true });
    assert.ok(alongside && alongside.track === 'foundations');
    assert.equal(alongside.story.language, 'qab', 'the story stays in the local language');
    assert.ok(alongside.movements.state === 'not-in-language');
    const english = alongside.movements.english;
    assert.ok(english.state === 'shown');
    assert.equal(english.formation.language, 'en');
    assert.equal(english.formation.provenance.resource, 'en_obs-tf');
    assert.deepEqual(
      english.formation.movements.map((movement) => movement.id),
      ['observation', 'translation', 'discourse', 'theological', 'journal'],
    );
    assert.deepEqual(
      alongside.outline,
      [
        'key-idea',
        'creedal-verse',
        'summary',
        'frames',
        'study-questions',
        'observation',
        'translation',
        'discourse',
        'theological',
        'journal',
        'drafting',
        'checking',
        'conclusion',
      ],
      'the study questions stay alongside the English movements',
    );

    const off = await formation.session('foundations', 1, 'qab', { englishAlongside: false });
    assert.ok(off && off.track === 'foundations');
    assert.deepEqual(off.movements, { state: 'not-in-language', english: { state: 'off' } });

    const tracks = await formation.tracks('qab');
    assert.deepEqual(tracks[0], { track: 'foundations', sessions: 3, movements: 'not-in-language' });
  },
);
