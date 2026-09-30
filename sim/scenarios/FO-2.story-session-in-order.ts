import assert from 'node:assert/strict';
import { imagePackId, languagePackId } from '@lib/domain/pack';
import { installFromCatalog, withFormation } from '../install';
import { scenario } from '../scenario';

const movements = ['observation', 'translation', 'discourse', 'theological', 'journal'];

export default scenario(
  'FO-2',
  'a Foundations session opens with the key idea, creedal verse and summary, then the frames, then the five movements, then what the content adds',
  async (world) => {
    const device = world.device('phone');
    await device.start();
    await installFromCatalog(device, [languagePackId('qaa'), imagePackId], withFormation);
    const formation = device.kernel.formation;

    const first = await formation.session('foundations', 1, 'qaa');
    assert.ok(first && first.track === 'foundations');
    assert.deepEqual(first.outline, [
      'key-idea',
      'creedal-verse',
      'summary',
      'frames',
      ...movements,
      'drafting',
      'checking',
      'conclusion',
    ]);
    assert.equal(first.story.number, 1);
    assert.equal(first.story.title, 'The Creation');
    assert.equal(first.story.frames.length, 3);
    assert.ok(
      first.story.frames.every((frame) => frame.image !== undefined),
      'every frame has its image',
    );

    const layer = first.movements;
    assert.equal(layer.state, 'in-language');
    assert.ok(layer.state === 'in-language');
    const content = layer.formation;
    assert.equal(content.language, 'qaa');
    assert.equal(content.provenance.resource, 'qaa_obs-tf');
    assert.equal(content.keyIdea?.title, 'Key idea');
    assert.ok(content.keyIdea.blocks.length > 0);
    assert.equal(content.creedalVerse?.title, 'Creedal verse');
    assert.equal(content.summary?.title, 'Summary');
    assert.deepEqual(
      content.movements.map((movement) => movement.id),
      movements,
    );
    assert.deepEqual(
      content.closing.map((section) => section.id),
      ['drafting', 'checking', 'conclusion'],
    );

    const second = await formation.session('foundations', 2, 'qaa');
    assert.ok(second && second.track === 'foundations');
    assert.deepEqual(second.outline, ['key-idea', 'creedal-verse', 'summary', 'frames', ...movements]);
    assert.ok(second.movements.state === 'in-language');
    assert.deepEqual(second.movements.formation.closing, []);

    assert.equal(await formation.session('foundations', 4, 'qaa'), undefined);
    assert.equal(
      device.kernel.journal.read().filter((entry) => entry.type === 'SessionStarted').length,
      0,
      'reading a session starts nothing',
    );
  },
);
