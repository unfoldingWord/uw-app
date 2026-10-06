import { describe, expect, it } from 'vitest';
import { writeArchive } from '@lib/burrito/archive';
import { buildBurrito, type BurritoInput } from '@lib/burrito/build';
import { metadataPath, utf8, type BurritoFiles } from '@lib/burrito/files';
import { mimeTypes } from '@lib/burrito/flavors';
import { imagePackId, languagePackId, originalPackId, type PackId } from '@lib/domain/pack';
import { parseReference, type Reference } from '@lib/domain/reference';
import { archiveUrlOf } from '@lib/domain/release';
import { fromCatalog, fromFile } from '@lib/packs/source';
import { writeInstalledPack } from '@lib/packs/store';
import type { InstallOutcome, InstalledPack } from '@lib/packs/types';
import type { SimDevice } from './device';
import { installFromCatalog, withFormation } from './install';
import { createWorld } from './world';

function reference(text: string): Reference {
  const parsed = parseReference(text);
  if (!parsed.ok) {
    throw new Error(text);
  }
  return parsed.reference;
}

async function phone(packs: readonly PackId[]) {
  const device = createWorld().device('phone');
  await device.start();
  await installFromCatalog(device, packs, withFormation);
  return device;
}

async function importBurrito(device: SimDevice, root: string, files: BurritoFiles): Promise<InstallOutcome> {
  const path = `imports/${root}.zip`;
  await device.adapters.files.mkdir('imports');
  await device.adapters.files.writeBytes(path, writeArchive(files, { root, mtime: new Date(2026, 8, 1) }));
  return device.kernel.packs.install(fromFile(path));
}

async function forgetCorpus(device: SimDevice): Promise<void> {
  await device.adapters.db.run('DELETE FROM corpus_titles');
  await device.adapters.db.run('DELETE FROM corpus_burritos');
}

function installedPack(device: SimDevice, pack: PackId): InstalledPack {
  const found = device.kernel.packs.installed().find((item) => item.pack === pack);
  if (found === undefined) {
    throw new Error(`${pack} is not installed`);
  }
  return found;
}

const qaa = languagePackId('qaa');

function burrito(
  overrides: Partial<BurritoInput> & Pick<BurritoInput, 'resource' | 'flavorType' | 'flavor' | 'ingredients'>,
) {
  return buildBurrito({
    publisher: 'unfoldingWord',
    commit: 'abc123',
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
\v 22 So Naomi returned.\f + \fr 1:22 \ft Some copies add with Ruth.\f*
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
      [
        1,
        expect.stringMatching(
          /^packs\/language\/qaa\/[^/]+\/unfoldingWord\/qaa_obs\/ingredients\/images\/obs-en-01-01\.jpg$/,
        ),
        'qaa_obs',
      ],
      [
        2,
        expect.stringMatching(
          /^packs\/image\/obs\/[^/]+\/unfoldingWord\/en_obs\/ingredients\/images\/obs-en-01-02\.jpg$/,
        ),
        'en_obs',
      ],
      [
        3,
        expect.stringMatching(
          /^packs\/image\/obs\/[^/]+\/unfoldingWord\/en_obs\/ingredients\/images\/obs-en-01-03\.jpg$/,
        ),
        'en_obs',
      ],
    ]);
    for (const frame of story?.frames ?? []) {
      expect(await device.adapters.files.exists(frame.image?.path ?? '')).toBe(true);
    }
    expect(story?.notes.map((note) => [note.id, note.frame, note.study])).toEqual([
      ['s002', 1, false],
      ['s003', 2, false],
    ]);
    expect(story?.questions.map((question) => [question.id, question.frame, question.study])).toEqual([
      ['q001', 1, true],
      ['q002', 3, true],
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
    const other = device.kernel.catalog.all().find((release) => release.publisher === 'Door43-Catalog');
    expect(other?.resource).toBe('qaa_obs');
    if (other === undefined) {
      return;
    }
    const added = await device.kernel.packs.install(fromCatalog([other]), { pack: qaa });
    expect(added.ok).toBe(true);
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

describe('corpus book names', () => {
  it('names a book from the installed text in its language, keeps the name across a restart, and falls back to the English name', async () => {
    const device = await phone([]);
    const named = String.raw`\id RUT qac_ult
\h Rut kitab
\toc1 Kitab Rut
\toc2 Rut
\c 1
\v 16 Ruth said.`;
    const imported = await importBurrito(
      device,
      'qac_ult',
      burrito({
        resource: 'qac_ult',
        flavorType: 'scripture',
        flavor: 'textTranslation',
        ingredients: [
          { path: '08-RUT.usfm', bytes: utf8(named), mimeType: mimeTypes.usfm, scope: { RUT: ['1'] } },
        ],
      }),
    );
    expect(imported.ok).toBe(true);
    expect(device.kernel.corpus.bookName('RUT', 'qac')).toBe('Rut');
    expect(device.kernel.corpus.referenceName('RUT 1:16', 'qac')).toBe('Rut 1:16');
    expect(device.kernel.corpus.referenceName('RUT 1:16-18', 'qac')).toBe('Rut 1:16-18');
    expect(device.kernel.corpus.bookName('3JN', 'qac')).toBe('3 John');
    expect(device.kernel.corpus.bookName('RUT', 'qab')).toBe('Ruth');
    expect(device.kernel.corpus.referenceName('not a reference', 'qac')).toBe('not a reference');
    await device.restart();
    expect(device.kernel.corpus.bookName('RUT', 'qac')).toBe('Rut');
  });

  it('reads the Hebrew name of the original-language text', async () => {
    const device = await phone([originalPackId('hbo')]);
    expect(device.kernel.corpus.bookName('RUT', 'hbo')).toBe('רות');
  });
});

describe('corpus passages beyond the fixture language', () => {
  it('reads a range across chapters, and a passage with no helps installed', async () => {
    const device = await phone([]);
    const imported = await importBurrito(
      device,
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
    expect(imported.ok && imported.pack.pack).toBe(languagePackId('qac'));
    const passage = await device.kernel.corpus.passage(reference('RUT 1:22-2:2'), { language: 'qac' });
    expect(passage?.reference).toBe('RUT 1:22-2:2');
    expect(passage?.text.verses.map((verse) => `${verse.chapter}:${verse.verse}`)).toEqual([
      '1:22',
      '2:1',
      '2:2',
    ]);
    expect(
      passage?.text.verses.map((verse) => [verse.text, verse.footnotes]),
      'a footnote stays on its verse as the publisher wrote it, outside the text',
    ).toEqual([
      ['So Naomi returned.', ['Some copies add with Ruth.']],
      ['Naomi had a relative.', undefined],
      ['Ruth said to Naomi.', undefined],
    ]);
    expect(passage?.notes).toEqual([]);
    expect(passage?.wordLinks).toEqual([]);
    expect(passage?.questions).toEqual([]);
    expect(passage?.availableTexts).toEqual(['literal']);
    expect(
      (await device.kernel.corpus.passage(reference('RUT 1-2'), { language: 'qac' }))?.text.verses,
    ).toHaveLength(5);
    expect(
      (await device.kernel.corpus.passage(reference('RUT 1:22'), { language: 'qac', text: 'simplified' }))
        ?.text.reading,
      'a reading the language does not carry falls back to the one it does',
    ).toBe('literal');
    expect(
      await device.kernel.corpus.passage(reference('RUT 1:22'), { language: 'qac', text: 'original' }),
    ).toBeUndefined();
    const contents = await device.kernel.corpus.contents('qac');
    expect(contents.texts[0]?.books).toEqual([{ code: 'RUT', chapters: [1, 2, 3, 4] }]);
  });

  it('never sees a flavor outside the contract, and ignores an ingredient key that leaves the burrito', async () => {
    const device = await phone([]);
    const odd = await importBurrito(
      device,
      'qac_odd',
      burrito({ resource: 'qac_odd', flavorType: 'peripheral', flavor: 'x-unknown', ingredients: [] }),
    );
    expect(odd.ok).toBe(false);
    expect(device.kernel.corpus.languages()).toEqual([]);

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
    expect((await importBurrito(device, 'qac_ult', text)).ok).toBe(true);
    const pack = installedPack(device, languagePackId('qac'));
    const [installed] = pack.burritos;
    expect(installed?.row).toBe('text');
    if (installed === undefined) {
      return;
    }
    const metadata = JSON.parse(
      await device.adapters.files.readText(`${installed.root}/${metadataPath}`),
    ) as {
      ingredients: Record<string, { scope?: Record<string, string[]> }>;
    };
    const listed = metadata.ingredients['ingredients/08-RUT.usfm'];
    metadata.ingredients['ingredients/../../../secret/07-JDG.usfm'] = { ...listed, scope: { JDG: ['1'] } };
    await device.adapters.files.writeText(`${installed.root}/${metadataPath}`, JSON.stringify(metadata));
    await device.adapters.files.mkdir('packs/language/qac/secret');
    await device.adapters.files.writeText(
      'packs/language/qac/secret/07-JDG.usfm',
      String.raw`\id JDG
\c 1
\v 1 Outside.`,
    );

    await forgetCorpus(device);
    await device.restart();
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
    const [good] = installedPack(device, qaa).burritos;
    expect(good).toBeDefined();
    if (good === undefined) {
      return;
    }
    await device.adapters.db.transaction((transaction) =>
      writeInstalledPack(transaction, {
        pack: languagePackId('qad'),
        kind: 'language',
        language: 'qad',
        source: 'file',
        bytes: 0,
        burritos: [{ ...good, root: 'packs/language/qad/unfoldingWord/qad_ult' }],
      }),
    );
    await device.restart();
    const failure = device.kernel.journal.read().find((entry) => entry.type === 'Failure');
    expect(failure?.payload).toEqual({ code: 'corpus.unreadable', context: { pack: 'language:qad' } });
    expect(device.kernel.corpus.summary('qaa').literal?.burritos).toBe(1);
    expect(device.kernel.corpus.languages()).toEqual(['qaa']);
  });
});

describe('corpus opened passages (ST-1, ST-10)', () => {
  it('journals the reference a leader opened without assembling it, and reads a chapter around it silently', async () => {
    const device = await phone([qaa]);
    const corpus = device.kernel.corpus;
    const opened = () =>
      device.kernel.journal
        .read()
        .flatMap((entry) => (entry.type === 'PassageOpened' ? [entry.payload] : []));
    const chapter = await corpus.passage(reference('RUT 1'), { language: 'qaa', journal: false });
    expect(chapter?.text.verses.length).toBe(5);
    expect(opened()).toEqual([]);
    await corpus.opened(reference('RUT 1:16'), 'qaa');
    expect(opened()).toEqual([{ reference: 'RUT 1:16', language: 'qaa' }]);
    expect(device.kernel.preferences.lastPassage('qaa')).toBe('RUT 1:16');
    await corpus.passage(reference('3JN 1:2'), { language: 'qaa' });
    expect(opened()).toEqual([
      { reference: 'RUT 1:16', language: 'qaa' },
      { reference: '3JN 1:2', language: 'qaa' },
    ]);
  });
});

describe('corpus packs and replay', () => {
  it('offers reads and index controls only, never ingest or drop, so Packs events alone change what it holds', async () => {
    const device = await phone([]);
    const surface = Object.keys(device.kernel.corpus);
    expect(surface).not.toContain('ingest');
    expect(surface).not.toContain('drop');
  });

  it('reads an installed pack again on start when its own tables lost it, and forgets a removed pack everywhere', async () => {
    const device = await phone([qaa]);
    expect(device.kernel.corpus.summary('qaa').words).toEqual({
      burritos: 1,
      items: 6,
      publishers: ['unfoldingWord'],
    });
    await forgetCorpus(device);
    await device.restart();
    expect(
      device.kernel.corpus.languages(),
      'on start the corpus follows what Packs holds, so a pack still installed is read again',
    ).toEqual(['qaa']);
    expect(device.kernel.corpus.summary('qaa').words?.items).toBe(6);

    expect((await device.kernel.packs.remove(qaa)).ok).toBe(true);
    expect(device.kernel.corpus.languages()).toEqual([]);
    expect((await device.kernel.corpus.search('love', 'qaa')).titles).toEqual([]);
    expect(await device.kernel.corpus.article('tw/bible/kt/love', 'qaa')).toBeUndefined();
    expect(device.kernel.snapshot().modules.corpus).toEqual({ indexes: {}, languages: {} });
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
    await installFromCatalog(second, [qaa]);
    expect(await second.kernel.redo(started)).toBe('redone');
    expect(second.kernel.corpus.index('qaa')).toEqual(device.kernel.corpus.index('qaa'));
  });
});

async function notesReleases(device: SimDevice): Promise<string[]> {
  const rows = await device.adapters.db.all(
    "SELECT provenance FROM corpus_burritos WHERE provenance LIKE '%qaa_tn%' ORDER BY root",
  );
  return rows.map((row) => {
    const provenance = JSON.parse(String(row.provenance)) as { resource: string; tag: string };
    return `${provenance.resource}@${provenance.tag}`;
  });
}

describe('corpus follows Packs through PackInstalled and PackRemoved (LA-2, LA-6, LA-7, PRD 8.5)', () => {
  it('reads what Packs installs, only the newest release after an update, nothing after a removal, and rebuilds from its own tables', async () => {
    const world = createWorld();
    const device = world.device('phone');
    await device.start();
    const ruth = reference('RUT 1:16');

    await installFromCatalog(device, [qaa]);
    const installed = await device.kernel.corpus.passage(ruth, { language: 'qaa' });
    expect(installed?.text.provenance.resource).toBe('qaa_ult');
    expect(installed?.notes.map((note) => note.provenance.tag)).toEqual(['v1']);
    expect(await notesReleases(device)).toEqual(['qaa_tn@v1']);

    world.fixtures.publish('unfoldingWord', 'qaa_tn', 'v2');
    await device.kernel.catalog.refresh();
    const updated = await device.kernel.packs.update(qaa);
    expect(updated.ok).toBe(true);
    const after = await device.kernel.corpus.passage(ruth, { language: 'qaa' });
    expect(after?.notes.map((note) => note.provenance.tag)).toEqual(['v2']);
    expect(await notesReleases(device)).toEqual(['qaa_tn@v2']);
    expect(device.kernel.corpus.summary('qaa').notes).toEqual({
      burritos: 1,
      items: expect.any(Number) as number,
      publishers: ['unfoldingWord'],
    });

    const before = device.kernel.corpus.summary('qaa');
    const snapshot = device.kernel.snapshot().modules.corpus;
    const lastSeq = device.kernel.journal.stats().lastSeq;
    await device.restart();
    expect(
      device.kernel.journal
        .read(lastSeq)
        .map((entry) => entry.type)
        .filter((type) => type !== 'AppOpened'),
    ).toEqual([]);
    expect(device.kernel.corpus.summary('qaa')).toEqual(before);
    expect(device.kernel.snapshot().modules.corpus).toEqual(snapshot);
    const restarted = await device.kernel.corpus.passage(ruth, { language: 'qaa' });
    expect(restarted?.notes).toEqual(after?.notes);

    expect((await device.kernel.packs.remove(qaa)).ok).toBe(true);
    expect(device.kernel.corpus.languages()).toEqual([]);
    expect(await device.kernel.corpus.passage(ruth, { language: 'qaa' })).toBeUndefined();
    expect(await device.adapters.db.all('SELECT root FROM corpus_burritos')).toEqual([]);
    await device.restart();
    expect(device.kernel.corpus.languages()).toEqual([]);
  });

  it('keeps the installed release whole when an update fails', async () => {
    const world = createWorld();
    const device = world.device('phone');
    await device.start();
    await installFromCatalog(device, [qaa]);
    world.fixtures.publish('unfoldingWord', 'qaa_tn', 'v2');
    await device.kernel.catalog.refresh();
    const newer = device.kernel.catalog.all().find((release) => release.resource === 'qaa_tn');
    expect(newer?.tag).toBe('v2');
    if (newer === undefined) {
      return;
    }
    device.adapters.http.script(archiveUrlOf(newer), 'timeout');
    const failed = await device.kernel.packs.update(qaa);
    expect(!failed.ok && failed.code).toBe('http.timeout');
    const passage = await device.kernel.corpus.passage(reference('RUT 1:16'), { language: 'qaa' });
    expect(passage?.notes.map((note) => note.provenance.tag)).toEqual(['v1']);
    expect(await notesReleases(device)).toEqual(['qaa_tn@v1']);
  });
});

describe('corpus note attachment', () => {
  it('counts the quoted notes of each installed notes burrito and how many attach to a word', async () => {
    const device = await phone([qaa]);
    const [notes, ...others] = await device.kernel.corpus.attachment('qaa');
    expect(others).toEqual([]);
    expect(notes?.provenance.resource).toBe('qaa_tn');
    expect(notes?.text).toBe('qaa_ult');
    expect(notes?.books).toEqual({
      RUT: { quoted: 2, attached: 1 },
      '3JN': { quoted: 3, attached: 3 },
    });
    expect([notes?.quoted, notes?.attached]).toEqual([5, 4]);
    const letter = await device.kernel.corpus.attachment('qaa', ['3JN']);
    expect(letter[0]?.books).toEqual({ '3JN': { quoted: 3, attached: 3 } });
    expect(await device.kernel.corpus.attachment('qab')).toEqual([]);
  });

  it('counts against the literal text only, so a language with only a simplified text counts no book', async () => {
    const world = createWorld();
    const device = world.device('phone');
    await device.start();
    await device.adapters.files.mkdir('imports');
    for (const resource of ['qaa_ust', 'qaa_tn']) {
      const archive = world.fixtures.archive('unfoldingWord', resource, 'v1');
      expect(archive).toBeDefined();
      await device.adapters.files.writeBytes(`imports/${resource}.zip`, archive ?? new Uint8Array());
      const imported = await device.kernel.packs.install(fromFile(`imports/${resource}.zip`));
      expect(imported.ok, imported.ok ? '' : imported.code).toBe(true);
    }
    const [notes] = await device.kernel.corpus.attachment('qaa');
    expect(notes?.provenance.resource).toBe('qaa_tn');
    expect(notes?.books).toEqual({});
    expect([notes?.quoted, notes?.attached]).toEqual([0, 0]);
  });

  it('counts one book at a time without evicting the books a reader has open', async () => {
    const device = await phone([qaa]);
    const ruth = reference('RUT 1:16');
    expect(await device.kernel.corpus.passage(ruth, { language: 'qaa' })).toBeDefined();
    await device.kernel.corpus.attachment('qaa');
    const reads: string[] = [];
    const stop = device.adapters.files.onRead((_, path) => reads.push(path));
    expect(await device.kernel.corpus.passage(ruth, { language: 'qaa' })).toBeDefined();
    stop();
    expect(
      reads.filter((path) => /\.(usfm|tsv)$/.test(path)),
      'the passage is still read from the cache after a count over every book',
    ).toEqual([]);
  });
});
