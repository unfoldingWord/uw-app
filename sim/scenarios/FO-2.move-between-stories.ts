import assert from 'node:assert/strict';
import { imagePackId, languagePackId } from '@lib/domain/pack';
import { installFromCatalog, withFormation } from '../install';
import { scenario } from '../scenario';
import { servicesOf } from '../services';
import { valueOf } from '../written';

export default scenario(
  'FO-2',
  'a leader reaches any story from the one they are reading, and browsing moves a group only when the leader says so',
  async (world) => {
    const device = world.device('phone');
    await device.start();
    await installFromCatalog(device, [languagePackId('qaa'), imagePackId], withFormation);
    await device.kernel.preferences.set('study.language', 'qaa');
    const formation = servicesOf(device).formation;

    const first = await formation.storyList(1);
    assert.deepEqual(
      first.stories.map((story) => [story.number, story.title]),
      [
        [1, 'The Creation'],
        [2, 'Sin Enters the World'],
        [3, 'The Flood'],
      ],
      'the story list names every story on the phone',
    );
    assert.equal(first.previous, undefined, 'the first story has no previous story');
    assert.equal(first.next, 2);
    const middle = await formation.storyList(2);
    assert.deepEqual([middle.previous, middle.next], [1, 3]);
    const last = await formation.storyList(3);
    assert.deepEqual([last.previous, last.next], [2, undefined], 'the last story has no next story');

    const group = valueOf(await formation.create('Tuesday group'));
    assert.ok(group);
    assert.deepEqual(group.position, { track: 'foundations', session: 1, movement: 'observation' });

    const browsed = await formation.session('foundations', last.previous ?? 0);
    assert.ok(browsed?.track === 'foundations' && browsed.number === 2);
    const read = await formation.read(3);
    assert.equal(read?.number, 3);
    assert.deepEqual(
      formation.group(group.id)?.position,
      group.position,
      'opening another story in either mode leaves the group where it was',
    );
    assert.ok(
      !device.kernel.journal.read().some((entry) => entry.type === 'PositionChanged'),
      'browsing writes no position',
    );

    const moved = valueOf(await formation.advance(group.id, { track: 'foundations', session: 3 }));
    assert.equal(moved?.position.session, 3, 'the group moves once the leader confirms');
  },
);
