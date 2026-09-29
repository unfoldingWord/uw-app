import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { readArchive } from '@lib/burrito/archive';
import { buildBurrito, type BurritoInput } from '@lib/burrito/build';
import { metadataPath, utf8 } from '@lib/burrito/files';
import { mimeTypes } from '@lib/burrito/flavors';
import { imagePackId, languagePackId } from '@lib/domain/pack';
import { parseReference, type Reference } from '@lib/domain/reference';
import { installFixturePacks, unpackFixturePack, writeBurrito } from './corpus-fixtures';
import { createWorld } from './world';

function reference(text: string): Reference {
  const parsed = parseReference(text);
  if (!parsed.ok) {
    throw new Error(text);
  }
  return parsed.reference;
}

async function phone(packs: readonly string[]) {
  const device = createWorld().device('phone');
  await device.start();
  await installFixturePacks(device, packs);
  return device;
}

const qaa = languagePackId('qaa');

function burrito(
  overrides: Partial<BurritoInput> & Pick<BurritoInput, 'resource' | 'flavorType' | 'flavor' | 'ingredients'>,
) {
  return buildBurrito({
    publisher: 'unfoldingWord',
    tag: 'v1',
    commit: 'abc123',
    released: '2026-09-01T00:00:00Z',
    dateCreated: '2026-09-01T00:00:00Z',
    generator: { softwareName: 'corpus test', softwareVersion: '1' },
    language: { tag: 'qac', name: { en: 'Fixture language C' } },
    name: { en: overrides.resource },
    abbreviation: { en: overrides.resource },
    licence: { statement: 'Released under CC BY-SA 4.0', text: 'CC BY-SA 4.0' },
    ...overrides,
  });
}

const twoChapters = String.raw`\id RUT qac_ult
\h Ruth
\c 1
\v 21 I went out full.
\v 22 So Naomi returned.
\c 2
\v 1 Naomi had a relative.
\v 2 Ruth said to Naomi.
\v 3 She went.`;

describe('corpus stories', () => {
  it('reads frames with the language image override first, then the shared image pack', async () => {
    const device = await phone([qaa, imagePackId]);
    const story = await device.kernel.corpus.story(1, 'qaa');
    expect(story?.title).toBe('The Creation');
    expect(story?.references).toEqual(['GEN 1-2']);
    expect(
      story?.frames.map((frame) => [frame.number, frame.image?.path, frame.image?.provenance.resource]),
    ).toEqual([
      [1, 'packs/language/qaa/unfoldingWord/qaa_obs/ingredients/images/obs-en-01-01.jpg', 'qaa_obs'],
      [2, 'packs/image/obs/unfoldingWord/obs-images/ingredients/images/obs-en-01-02.jpg', 'obs-images'],
      [3, 'packs/image/obs/unfoldingWord/obs-images/ingredients/images/obs-en-01-03.jpg', 'obs-images'],
    ]);
    for (const frame of story?.frames ?? []) {
      expect(await device.adapters.files.exists(frame.image?.path ?? '')).toBe(true);
    }
    expect(story?.notes.map((note) => [note.id, note.frame])).toEqual([
      ['s002', 1],
      ['s003', 2],
    ]);
    expect(story?.questions.map((question) => [question.id, question.frame])).toEqual([
      ['q001', 1],
      ['q002', 3],
    ]);
    expect(
      device.kernel.journal
        .read()
        .filter((entry) => entry.type === 'StoryOpened')
        .map((entry) => entry.payload),
    ).toEqual([{ story: 1, language: 'qaa' }]);
  });

  it('names a frame image it cannot find, and has no story it was not given', async () => {
    const device = await phone([qaa]);
    const story = await device.kernel.corpus.story(1, 'qaa');
    expect(story?.frames[1]?.imageName).toBe('obs-en-01-02.jpg');
    expect(story?.frames[1]?.image).toBeUndefined();
    expect(await device.kernel.corpus.story(4, 'qaa')).toBeUndefined();
    expect(await device.kernel.corpus.story(1, 'qad')).toBeUndefined();
  });

  it('prefers unfoldingWord when two publishers carry the stories', async () => {
    const device = await phone([qaa]);
    const other = languagePackId('qaa-door43');
    const read = readArchive(
      new Uint8Array(readFileSync(new URL('./fixtures/sb/Door43-Catalog/qaa_obs/v2.zip', import.meta.url))),
    );
    if (!read.ok) {
      throw new Error(read.message);
    }
    await writeBurrito(device, other, 'Door43-Catalog', read.root, read.files);
    await device.kernel.corpus.ingest(await device.kernel.corpus.describe(other));
    expect(device.kernel.corpus.summary('qaa').stories).toEqual({
      burritos: 2,
      items: 6,
      publishers: ['unfoldingWord', 'Door43-Catalog'],
    });
    expect((await device.kernel.corpus.story(1, 'qaa'))?.provenance.publisher).toBe('unfoldingWord');
  });
});

describe('corpus movements', () => {
  it('parses the five movements and the sections around them in their order', async () => {
    const device = await phone([qaa, languagePackId('qab'), languagePackId('en')]);
    const first = await device.kernel.corpus.movements(1, 'qaa');
    expect(first?.sections.map((section) => section.id)).toEqual([
      'key-idea',
      'creedal-verse',
      'summary',
      'observation',
      'translation',
      'discourse',
      'theological',
      'journal',
      'drafting',
      'checking',
      'conclusion',
    ]);
    expect(first?.sections[0]?.title).toBe('Key idea');
    expect(first?.sections[1]?.blocks.some((block) => block.kind === 'quote')).toBe(true);
    expect(first?.provenance.resource).toBe('qaa_obs-tf');
    expect((await device.kernel.corpus.movements(2, 'qaa'))?.sections).toHaveLength(8);
    expect(await device.kernel.corpus.movementStories('qaa')).toEqual([1, 2, 3]);
    expect(await device.kernel.corpus.movementStories('qab')).toEqual([]);
    expect(await device.kernel.corpus.movements(1, 'qab')).toBeUndefined();
    expect((await device.kernel.corpus.movements(1, 'en'))?.language).toBe('en');
  });
});

describe('corpus contents', () => {
  it('lists texts with books and chapters, articles in order, stories, movements and audio', async () => {
    const device = await phone([qaa]);
    const contents = await device.kernel.corpus.contents('qaa');
    expect(contents.texts.map((text) => [text.reading, text.books])).toEqual([
      [
        'literal',
        [
          { code: 'RUT', chapters: [1] },
          { code: '3JN', chapters: [1] },
        ],
      ],
      [
        'simplified',
        [
          { code: 'RUT', chapters: [1] },
          { code: '3JN', chapters: [1] },
        ],
      ],
    ]);
    expect(contents.academy.map((entry) => entry.id)).toEqual([
      'ta/translate/figs-metaphor',
      'ta/translate/figs-idiom',
      'ta/translate/translate-names',
    ]);
    expect(contents.words.map((entry) => entry.title)).toEqual([
      'God',
      'love, beloved',
      'truth, true',
      'Naomi',
      'Ruth',
      'famine',
    ]);
    expect(contents.stories.map((story) => story.number)).toEqual([1, 2, 3]);
    expect(contents.movements).toEqual([1, 2, 3]);
    expect(contents.audio).toEqual([]);
  });
});

describe('corpus passages beyond the fixture language', () => {
  it('reads a range across chapters, and a passage with no helps installed', async () => {
    const device = await phone([]);
    const pack = languagePackId('qac');
    await writeBurrito(
      device,
      pack,
      'unfoldingWord',
      'qac_ult',
      burrito({
        resource: 'qac_ult',
        flavorType: 'scripture',
        flavor: 'textTranslation',
        ingredients: [
          {
            path: '08-RUT.usfm',
            bytes: utf8(twoChapters),
            mimeType: mimeTypes.usfm,
            scope: { RUT: ['1', '2'] },
          },
        ],
      }),
    );
    await device.kernel.corpus.ingest(await device.kernel.corpus.describe(pack));
    const passage = await device.kernel.corpus.passage(reference('RUT 1:22-2:2'), { language: 'qac' });
    expect(passage?.reference).toBe('RUT 1:22-2:2');
    expect(passage?.text.verses.map((verse) => `${verse.chapter}:${verse.verse}`)).toEqual([
      '1:22',
      '2:1',
      '2:2',
    ]);
    expect(passage?.notes).toEqual([]);
    expect(passage?.wordLinks).toEqual([]);
    expect(passage?.questions).toEqual([]);
    expect(passage?.availableTexts).toEqual([]);
    expect(
      (await device.kernel.corpus.passage(reference('RUT 1-2'), { language: 'qac' }))?.text.verses,
    ).toHaveLength(5);
    expect(
      await device.kernel.corpus.passage(reference('RUT 1:16'), { language: 'qac', text: 'simplified' }),
    ).toBeUndefined();
    const contents = await device.kernel.corpus.contents('qac');
    expect(contents.texts[0]?.books).toEqual([{ code: 'RUT', chapters: [1, 2, 3, 4] }]);
  });

  it('ignores a flavor outside the contract and an ingredient key that leaves the burrito', async () => {
    const device = await phone([]);
    const pack = languagePackId('qac');
    await writeBurrito(
      device,
      pack,
      'unfoldingWord',
      'qac_odd',
      burrito({ resource: 'qac_odd', flavorType: 'peripheral', flavor: 'x-unknown', ingredients: [] }),
    );
    const text = burrito({
      resource: 'qac_ult',
      flavorType: 'scripture',
      flavor: 'textTranslation',
      ingredients: [
        {
          path: '08-RUT.usfm',
          bytes: utf8(twoChapters),
          mimeType: mimeTypes.usfm,
          scope: { RUT: ['1', '2'] },
        },
      ],
    });
    const metadata = JSON.parse(new TextDecoder().decode(text.get(metadataPath))) as {
      ingredients: Record<string, { scope?: Record<string, string[]> }>;
    };
    const listed = metadata.ingredients['ingredients/08-RUT.usfm'];
    metadata.ingredients['ingredients/../../../secret/07-JDG.usfm'] = { ...listed, scope: { JDG: ['1'] } };
    const tampered = new Map(text);
    tampered.set(metadataPath, utf8(JSON.stringify(metadata)));
    await writeBurrito(device, pack, 'unfoldingWord', 'qac_ult', tampered);

    const source = await device.kernel.corpus.describe(pack);
    expect(source.burritos.map((item) => [item.row, item.resource])).toEqual([['text', 'qac_ult']]);
    await device.kernel.corpus.ingest(source);
    expect(device.kernel.corpus.summary('qac')).toEqual({
      literal: { burritos: 1, items: 1, publishers: ['unfoldingWord'] },
    });
    expect(await device.kernel.corpus.passage(reference('JDG 1:1'), { language: 'qac' })).toBeUndefined();
  });

  it('records a pack it cannot read as a failure with a code, and keeps what it had', async () => {
    const device = await phone([qaa]);
    await device.adapters.files.mkdir('packs/language/qad/unfoldingWord/qad_ult');
    await device.adapters.files.writeText(
      'packs/language/qad/unfoldingWord/qad_ult/metadata.json',
      'not json',
    );
    const [good] = (await device.kernel.corpus.describe(qaa)).burritos;
    expect(good).toBeDefined();
    if (good === undefined) {
      return;
    }
    await device.kernel.corpus.ingest({
      pack: languagePackId('qad'),
      burritos: [{ ...good, root: 'packs/language/qad/unfoldingWord/qad_ult' }],
    });
    const failure = device.kernel.journal.read().find((entry) => entry.type === 'Failure');
    expect(failure?.payload).toEqual({ code: 'corpus.unreadable', context: { pack: 'language:qad' } });
    expect(device.kernel.corpus.summary('qaa').literal?.burritos).toBe(1);
    expect(device.kernel.corpus.languages()).toEqual(['qaa']);
  });
});

describe('corpus packs and replay', () => {
  it('forgets a dropped pack in queries, titles and the snapshot, and ingests again idempotently', async () => {
    const device = await phone([qaa]);
    await installFixturePacks(device, [qaa]);
    expect(device.kernel.corpus.summary('qaa').words).toEqual({
      burritos: 1,
      items: 6,
      publishers: ['unfoldingWord'],
    });
    await device.kernel.corpus.drop(qaa);
    expect(device.kernel.corpus.languages()).toEqual([]);
    expect((await device.kernel.corpus.search('love', 'qaa')).titles).toEqual([]);
    expect(await device.kernel.corpus.article('tw/bible/kt/love', 'qaa')).toBeUndefined();
    expect(device.kernel.snapshot().modules.corpus).toEqual({ indexes: {}, languages: {} });
    await device.restart();
    expect(device.kernel.corpus.languages()).toEqual([]);
  });

  it('redoes a recorded index build from its IndexStarted event', async () => {
    const device = await phone([qaa]);
    await device.kernel.corpus.reindex('qaa');
    const started = device.kernel.journal.read().find((entry) => entry.type === 'IndexStarted');
    expect(started).toBeDefined();
    if (started === undefined) {
      return;
    }
    const second = createWorld().device('replayed');
    await second.start();
    await unpackFixturePack(second, qaa);
    await second.kernel.corpus.ingest(await second.kernel.corpus.describe(qaa));
    expect(await second.kernel.redo(started)).toBe('redone');
    expect(second.kernel.corpus.index('qaa')).toEqual(device.kernel.corpus.index('qaa'));
  });
});
