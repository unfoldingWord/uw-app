import assert from 'node:assert/strict';
import { imagePackId, languagePackId } from '@lib/domain/pack';
import { installFromCatalog, withFormation } from '../install';
import { scenario } from '../scenario';
import { servicesOf } from '../services';

export default scenario(
  'ST-8',
  'a story found by search opens in the one story reader at the matching frame, with the state Formation shows',
  async (world) => {
    const device = world.device('phone');
    await device.start();
    await installFromCatalog(device, [languagePackId('qaa'), imagePackId], withFormation);
    await device.kernel.preferences.set('study.language', 'qaa');
    const services = servicesOf(device);
    await device.kernel.corpus.reindex('qaa');

    const hits = await services.study.fullText('breathed');
    assert.deepEqual(
      hits.map((hit) => hit.target),
      [{ kind: 'story', story: 1, frame: 3 }],
      'a full-text hit in a story carries the frame it matched',
    );
    const titles = await services.study.search('Creation');
    assert.ok(
      titles.state === 'results' &&
        titles.results.titles.some((hit) => hit.target.kind === 'story' && hit.target.story === 1),
      'a title hit opens the story at its first frame',
    );

    const fromSearch = await services.formation.read(1);
    const fromFormation = await services.formation.session('foundations', 1);
    assert.ok(fromSearch && fromFormation?.track === 'foundations');
    assert.deepEqual(fromSearch.story, fromFormation.story, 'both ways in read the same story');
    assert.deepEqual(fromSearch.play, fromFormation.play, 'both ways in play the same frames and audio');
    assert.ok(fromSearch.story.frames.every((frame) => services.formation.picture(frame) !== undefined));
    assert.deepEqual(
      device.kernel.journal
        .read()
        .filter((entry) => entry.type === 'StoryOpened')
        .map((entry) => entry.payload),
      [{ story: 1, language: 'qaa' }],
      'reading a story is journaled once',
    );

    assert.equal(services.formation.saved(1), undefined);
    const saved = await services.formation.save(1);
    assert.ok(saved?.ok);
    assert.equal(services.formation.saved(1)?.id, saved.value.id);
    assert.deepEqual(
      services.home.saved().map((item) => [item.kind, item.href]),
      [['story', '/formation/story/1']],
      'a saved story opens the same reader from Home',
    );
  },
);
