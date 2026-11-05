import assert from 'node:assert/strict';
import { languagePackId } from '@lib/domain/pack';
import { installFromCatalog, withFormation } from '../install';
import { scenario } from '../scenario';
import { servicesOf } from '../services';

export default scenario(
  'FO-2',
  'a reader browses the contents of every story without starting a session, with a picture for each story once the pictures are on the phone',
  async (world) => {
    const device = world.device('phone');
    await device.start();
    const formation = servicesOf(device).formation;

    assert.deepEqual(await formation.contents(), { state: 'no-language' }, 'no language, no contents');
    await device.kernel.preferences.set('study.language', 'qaa');
    assert.deepEqual(
      await formation.contents(),
      { state: 'not-downloaded', language: 'qaa' },
      'a language with no stories on the phone offers the download',
    );

    await installFromCatalog(device, [languagePackId('qaa')], withFormation);
    const before = await formation.contents();
    assert.ok(before.state === 'ready');
    assert.deepEqual(
      before.stories.map((story) => [story.number, story.title]),
      [
        [1, 'The Creation'],
        [2, 'Sin Enters the World'],
        [3, 'The Flood'],
      ],
      'the contents name every story on the phone, in order',
    );
    assert.deepEqual(
      before.stories.map((story) => story.picture !== undefined),
      [true, false, false],
      'a story shows a picture only when its first picture is on the phone',
    );
    assert.deepEqual(
      (await formation.storyList(2)).stories,
      before.stories,
      'the reader chooses from the same list the contents show',
    );

    assert.deepEqual(await formation.downloadPictures(), { ok: true });
    const after = await formation.contents();
    assert.ok(after.state === 'ready');
    assert.ok(
      after.stories.every((story) => story.picture !== undefined),
      'every story shows its picture once the Image Pack is on the phone',
    );

    const journal = () => device.kernel.journal.read();
    assert.ok(
      !journal().some((entry) => entry.type === 'StoryOpened' || entry.type === 'PositionChanged'),
      'browsing the contents opens no story and moves no group',
    );
    const read = await formation.read(3);
    assert.equal(read?.number, 3, 'a story picked from the contents opens in the reader');
    assert.deepEqual(
      journal()
        .filter((entry) => entry.type === 'StoryOpened')
        .map((entry) => entry.payload),
      [{ story: 3, language: 'qaa' }],
    );
  },
);
