import assert from 'node:assert/strict';
import { languagePackId } from '@lib/domain/pack';
import { installFromCatalog, withFormation } from '../install';
import { scenario } from '../scenario';

export default scenario(
  'FO-1',
  'Formation lists Foundations and Training for a language, and hides Topics while it has no sessions',
  async (world) => {
    const device = world.device('phone');
    await device.start();
    const formation = device.kernel.formation;

    assert.deepEqual(await formation.tracks('qaa'), [
      { track: 'foundations', sessions: 0, movements: 'not-in-language' },
      { track: 'training', sessions: 0 },
    ]);

    await installFromCatalog(device, [languagePackId('qaa'), languagePackId('qab')], withFormation);
    const contents = await device.kernel.corpus.contents('qaa');
    assert.equal(contents.stories.length, 3);
    assert.ok(contents.academy.length > 1);

    const tracks = await formation.tracks('qaa');
    assert.deepEqual(tracks, [
      { track: 'foundations', sessions: 3, movements: 'in-language' },
      { track: 'training', sessions: contents.academy.length },
    ]);
    assert.ok(!tracks.some((track) => track.track === 'topics'), 'Topics is hidden when empty');

    const training = [];
    for (let number = 1; number <= contents.academy.length; number += 1) {
      const session = await formation.session('training', number, 'qaa');
      assert.ok(session && session.track === 'training', `Training session ${number} opens`);
      training.push(session.article.id);
      assert.equal(session.article.provenance.resource, 'qaa_ta');
    }
    assert.deepEqual(
      training,
      contents.academy.map((entry) => entry.id),
      'Training walks Translation Academy in its table of contents order',
    );
    assert.equal(await formation.session('training', contents.academy.length + 1, 'qaa'), undefined);
    assert.deepEqual(
      await formation.trainingOutline('qaa'),
      {
        lessons: 3,
        units: [
          {
            manual: 'translate',
            title: 'Translation Manual',
            lessons: [
              { number: 1, title: 'Metaphor', id: 'ta/translate/figs-metaphor' },
              { number: 2, title: 'Idiom', id: 'ta/translate/figs-idiom' },
              { number: 3, title: 'How to Translate Names', id: 'ta/translate/translate-names' },
            ],
          },
        ],
      },
      'Training is a course: one unit per manual, titled from its table of contents, lessons numbered through the course',
    );
    assert.deepEqual(await formation.trainingOutline('qab'), { lessons: 0, units: [] });
    assert.equal(await formation.session('topics', 1, 'qaa'), undefined);

    assert.deepEqual(await formation.tracks('qab'), [
      { track: 'foundations', sessions: 3, movements: 'not-in-language' },
      { track: 'training', sessions: 0 },
    ]);
  },
);
