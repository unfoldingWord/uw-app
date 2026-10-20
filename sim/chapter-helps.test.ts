import { describe, expect, it } from 'vitest';
import { writeArchive } from '@lib/burrito/archive';
import { buildBurrito, type BurritoInput } from '@lib/burrito/build';
import { utf8, type BurritoFiles } from '@lib/burrito/files';
import { mimeTypes } from '@lib/burrito/flavors';
import { parseReference, type Reference } from '@lib/domain/reference';
import { createLibrary } from '@lib/corpus/library';
import { chapterNotes } from '@lib/corpus/loaders';
import { loadEntries } from '@lib/corpus/tables';
import { fromFile } from '@lib/packs/source';
import type { SimDevice } from './device';
import { createWorld } from './world';

type Script = {
  readonly tag: string;
  readonly direction: 'ltr' | 'rtl';
  readonly verse: (chapter: number, verse: number) => string;
  readonly note: (chapter: number) => string;
};

const scripts: readonly Script[] = [
  {
    tag: 'hi',
    direction: 'ltr',
    verse: (chapter, verse) => `रूत ने नाओमी से कहा ${chapter}:${verse}`,
    note: (chapter) => `यह अध्याय ${chapter} की टिप्पणी है`,
  },
  {
    tag: 'ar',
    direction: 'rtl',
    verse: (chapter, verse) => `قالت راعوث لنعمي ${chapter}:${verse}`,
    note: (chapter) => `هذه ملاحظة الأصحاح ${chapter}`,
  },
  {
    tag: 'zh',
    direction: 'ltr',
    verse: (chapter, verse) => `路得对拿俄米说 ${chapter}:${verse}`,
    note: (chapter) => `这是第${chapter}章的注释`,
  },
];

type Shape = 'current' | 'legacy' | 'quoted';

const shapes: readonly Shape[] = ['current', 'legacy', 'quoted'];

function usfmOf(script: Script): string {
  const chapter = (number: number) =>
    [`\\c ${number}`, ...[1, 2, 3].map((verse) => `\\v ${verse} ${script.verse(number, verse)}`)].join('\n');
  return [`\\id RUT ${script.tag}_ult`, '\\h Ruth', chapter(1), chapter(2), chapter(3)].join('\n');
}

function notesOf(script: Script, shape: Shape): string {
  const rows = [1, 2, 3].map((chapter) => ({ id: `a${chapter}`, chapter, note: script.note(chapter) }));
  switch (shape) {
    case 'current':
      return [
        'Reference\tID\tTags\tSupportReference\tQuote\tOccurrence\tNote',
        ...rows.map((row) => `${row.chapter}:1\t${row.id}\t\t\t\t0\t${row.note}`),
      ].join('\n');
    case 'legacy':
      return [
        'Book\tChapter\tVerse\tID\tSupportReference\tOrigQuote\tOccurrence\tGLQuote\tOccurrenceNote',
        ...rows.map((row) => `RUT\t${row.chapter}\t1\t${row.id}\t\t\t0\t\t${row.note}`),
      ].join('\n');
    case 'quoted':
      return [
        'Reference\tID\tTags\tSupportReference\tQuote\tOccurrence\tNote',
        ...rows.map((row) => `${row.chapter}:1\t${row.id}\t\t\t\t0\t"${row.note}\nsecond line"`),
      ].join('\n');
  }
}

function burrito(
  script: Script,
  overrides: Pick<BurritoInput, 'resource' | 'flavorType' | 'flavor' | 'ingredients'>,
): BurritoFiles {
  return buildBurrito({
    publisher: 'unfoldingWord',
    commit: 'abc123',
    dateCreated: '2026-09-01T00:00:00Z',
    generator: { softwareName: 'chapter helps test', softwareVersion: '1' },
    language: { tag: script.tag, name: { en: script.tag }, scriptDirection: script.direction },
    name: { en: overrides.resource },
    abbreviation: { en: overrides.resource },
    licence: { statement: 'Released under CC BY-SA 4.0', text: 'CC BY-SA 4.0' },
    ...overrides,
  });
}

async function importBurrito(device: SimDevice, root: string, files: BurritoFiles): Promise<void> {
  const path = `imports/${root}.zip`;
  await device.adapters.files.mkdir('imports');
  await device.adapters.files.writeBytes(path, writeArchive(files, { root, mtime: new Date(2026, 8, 1) }));
  const outcome = await device.kernel.packs.install(fromFile(path));
  expect(outcome.ok, outcome.ok ? '' : outcome.code).toBe(true);
}

function reference(text: string): Reference {
  const parsed = parseReference(text);
  if (!parsed.ok) {
    throw new Error(text);
  }
  return parsed.reference;
}

describe('chapter helps across scripts and table shapes (ST-2, PRD 8.4)', () => {
  for (const script of scripts) {
    for (const shape of shapes) {
      it(`shows only the opened chapter's notes for ${script.tag} with a ${shape} table, and keeps the text whole`, async () => {
        const device = createWorld().device('phone');
        await device.start();
        await importBurrito(
          device,
          `${script.tag}_ult`,
          burrito(script, {
            resource: `${script.tag}_ult`,
            flavorType: 'scripture',
            flavor: 'textTranslation',
            ingredients: [
              {
                path: '08-RUT.usfm',
                bytes: utf8(usfmOf(script)),
                mimeType: mimeTypes.usfm,
                scope: { RUT: ['1', '2', '3'] },
              },
            ],
          }),
        );
        await importBurrito(
          device,
          `${script.tag}_tn`,
          burrito(script, {
            resource: `${script.tag}_tn`,
            flavorType: 'parascriptural',
            flavor: 'x-bcvnotes',
            ingredients: [
              {
                path: 'tn_RUT.tsv',
                bytes: utf8(notesOf(script, shape)),
                mimeType: mimeTypes.tsv,
                scope: { RUT: [] },
              },
            ],
          }),
        );
        const library = createLibrary(device.adapters.files);
        library.put(await loadEntries(device.adapters.db), []);
        const [notes] = library.of(script.tag, ['notes']);
        expect(notes).toBeDefined();
        if (notes !== undefined) {
          for (const chapter of [1, 2, 3]) {
            const rows = await chapterNotes(library, notes, 'RUT', new Set([chapter]));
            expect(
              rows.map((row) => row.id),
              'the chapter loader keeps only the chapter it was asked for',
            ).toEqual([`a${chapter}`]);
          }
        }
        for (const chapter of [1, 2, 1, 3]) {
          const passage = await device.kernel.corpus.passage(reference(`RUT ${chapter}`), {
            language: script.tag,
          });
          expect(passage?.text.verses.map((verse) => verse.text)).toEqual(
            [1, 2, 3].map((verse) => script.verse(chapter, verse)),
          );
          expect(passage?.text.direction).toBe(script.direction);
          expect(passage?.notes.map((note) => note.id)).toEqual([`a${chapter}`]);
          expect(passage?.notes[0]?.blocks.length).toBeGreaterThan(0);
        }
      });
    }
  }
});
