import assert from 'node:assert/strict';
import { imagePackId, languagePackId } from '@lib/domain/pack';
import { installFromCatalog } from '../install';
import { scenario } from '../scenario';

export default scenario(
  'FO-3',
  'a story session carries what "Play and discuss" plays and a question list for every movement',
  async (world) => {
    const device = world.device('phone');
    await device.start();
    await installFromCatalog(device, [languagePackId('qaa'), imagePackId]);

    const session = await device.kernel.formation.session('foundations', 1, 'qaa');
    assert.ok(session && session.track === 'foundations');
    assert.deepEqual(
      session.play.frames.map((frame) => [frame.number, frame.image?.name]),
      [
        [1, 'obs-en-01-01.jpg'],
        [2, 'obs-en-01-02.jpg'],
        [3, 'obs-en-01-03.jpg'],
      ],
    );
    assert.ok(session.play.frames.every((frame) => frame.text.length > 0));
    assert.deepEqual(session.play.audio, { state: 'not-available' });

    assert.ok(session.movements.state === 'in-language');
    const questions = Object.fromEntries(
      session.movements.formation.movements.map((movement) => [movement.id, movement.questions]),
    );
    assert.deepEqual(questions, {
      observation: ['What happens in this story?', 'What does God do?'],
      translation: ['Retell the story in your own words, the way you would tell a neighbour.'],
      discourse: ['Talk together: what does this story show about how people respond to God?'],
      theological: ['What does this story teach about who God is and what he does?'],
      journal: ['Write one sentence about what you will remember from this story this week.'],
    });
    const observation = session.movements.formation.movements[0];
    assert.equal(observation?.title, 'Observation');
    assert.ok(observation.blocks.length > 0, 'the movement keeps its full text beside its questions');
    assert.ok(session.story.questions.length > 0, 'the study questions stay with the story');
  },
);
