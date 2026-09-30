import assert from 'node:assert/strict';
import { audioPackId, languagePackId } from '@lib/domain/pack';
import { installFromCatalog } from '../install';
import { scenario } from '../scenario';

const unfoldingWord = ['unfoldingWord'];

export default scenario(
  'ST-5',
  'the corpus counts each resource type installed for a language, with its publishers, for the catalog cards',
  async (world) => {
    const device = world.device('phone');
    await device.start();
    const corpus = device.kernel.corpus;
    assert.deepEqual(corpus.summary('qaa'), {}, 'nothing is counted before a pack is installed');

    await installFromCatalog(device, [
      languagePackId('qaa'),
      languagePackId('qab'),
      audioPackId('qaa', 'qaa_ult-audio'),
    ]);

    const count = (items: number) => ({ burritos: 1, items, publishers: unfoldingWord });
    assert.deepEqual(corpus.summary('qaa'), {
      literal: count(2),
      simplified: count(2),
      notes: count(8),
      wordLinks: count(6),
      questions: count(4),
      words: count(6),
      academy: count(3),
      stories: count(3),
      storyNotes: count(5),
      storyQuestions: count(4),
      storyWordLinks: count(2),
      movements: count(3),
      audio: count(1),
    });
    assert.deepEqual(corpus.summary('qab'), { stories: count(3), storyQuestions: count(4) });
    assert.deepEqual(corpus.languages(), ['qaa', 'qab']);

    const snapshot = device.kernel.snapshot().modules.corpus;
    assert.deepEqual(
      snapshot,
      {
        indexes: {},
        languages: { qaa: corpus.summary('qaa'), qab: corpus.summary('qab') },
      },
      'the snapshot carries the corpus summary',
    );

    assert.ok((await device.kernel.packs.remove(languagePackId('qab'))).ok);
    assert.deepEqual(corpus.summary('qab'), {});
  },
);
