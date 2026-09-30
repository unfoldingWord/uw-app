import { isTsv, isUsfm } from '../burrito/flavors';
import { licenceKeyOf } from '../burrito/licence';
import { originalPackId } from '../domain/pack';
import {
  academyEntries,
  audioEntries,
  bookKeys,
  imageKeys,
  isAcademy,
  movementKeys,
  storyHelpsFlavors,
  storyHelpsKey,
  storyKeys,
  wordKeys,
} from './layout';
import { readingOfText } from './readings';
import { storyTitle } from './stories';
import { provenanceOf, type BurritoReader } from './source';
import type { Entry, TitleRow } from './tables';
import { helpsRowCount } from './tsv';
import { usfmBookName } from './usfm';
import type { CorpusBurrito, CorpusKind } from './types';

const verseMarker = /\\v\s+\d/;

const stubBookBytes = 64 * 1024;

const headBytes = 4 * 1024;

async function hasVerses(reader: BurritoReader, key: string): Promise<boolean> {
  const size = reader.ingredients.find((ingredient) => ingredient.key === key)?.entry.size ?? 0;
  return size > stubBookBytes || verseMarker.test(await reader.read(key));
}

export type Analysis = { readonly entry: Entry; readonly titles: readonly TitleRow[] };

const originalPackPrefix = originalPackId('');

function textKind(pack: string, burrito: CorpusBurrito, reader: BurritoReader): CorpusKind {
  if (pack.startsWith(originalPackPrefix)) {
    return 'original';
  }
  return readingOfText(burrito.resource, burrito.language, reader.metadata.identification);
}

function storyHelpsKind(reader: BurritoReader): CorpusKind {
  const flavor: string = reader.metadata.type.flavorType.flavor.name;
  if (storyHelpsFlavors.questions.some((name) => name === flavor)) {
    return 'storyQuestions';
  }
  return storyHelpsFlavors.wordLinks.some((name) => name === flavor) ? 'storyWordLinks' : 'storyNotes';
}

function kindOf(pack: string, burrito: CorpusBurrito, reader: BurritoReader): CorpusKind {
  switch (burrito.row) {
    case 'text':
      return textKind(pack, burrito, reader);
    case 'storyHelps':
      return storyHelpsKind(reader);
    case 'articles':
      return isAcademy(reader) ? 'academy' : 'words';
    case 'formation':
      return 'movements';
    case 'notes':
    case 'wordLinks':
    case 'questions':
    case 'stories':
    case 'audio':
    case 'images':
      return burrito.row;
  }
}

function sizeOf(reader: BurritoReader, keys: Iterable<string>): number {
  const wanted = new Set(keys);
  return reader.ingredients
    .filter((ingredient) => wanted.has(ingredient.key))
    .reduce((sum, ingredient) => sum + ingredient.entry.size, 0);
}

type Counted = {
  books: readonly string[];
  bookNames?: Readonly<Record<string, string>>;
  items: number;
  bytes: number;
  titles: TitleRow[];
};

async function bookNamesOf(
  reader: BurritoReader,
  books: ReadonlyMap<string, string>,
): Promise<Record<string, string>> {
  const names: Record<string, string> = {};
  for (const [book, key] of books) {
    const name = usfmBookName(await reader.head(key, headBytes));
    if (name !== undefined) {
      names[book] = name;
    }
  }
  return names;
}

async function counted(kind: CorpusKind, reader: BurritoReader, language: string): Promise<Counted> {
  const title = (titleKind: TitleRow['kind'], target: string, text: string): TitleRow => ({
    root: reader.root,
    language,
    kind: titleKind,
    target,
    title: text,
  });
  switch (kind) {
    case 'literal':
    case 'simplified':
    case 'original': {
      const books = new Map<string, string>();
      for (const [book, key] of bookKeys(reader, isUsfm)) {
        if (await hasVerses(reader, key)) {
          books.set(book, key);
        }
      }
      return {
        books: [...books.keys()],
        bookNames: await bookNamesOf(reader, books),
        items: books.size,
        bytes: sizeOf(reader, books.values()),
        titles: [],
      };
    }
    case 'notes':
    case 'wordLinks':
    case 'questions': {
      const books = bookKeys(reader, isTsv);
      let items = 0;
      for (const key of books.values()) {
        items += helpsRowCount(await reader.read(key));
      }
      return { books: [...books.keys()], items, bytes: sizeOf(reader, books.values()), titles: [] };
    }
    case 'storyNotes':
    case 'storyQuestions':
    case 'storyWordLinks': {
      const key = storyHelpsKey(reader);
      const items = key === undefined ? 0 : helpsRowCount(await reader.read(key));
      return { books: [], items, bytes: key === undefined ? 0 : sizeOf(reader, [key]), titles: [] };
    }
    case 'words': {
      const articles = wordKeys(reader);
      const titles: TitleRow[] = [];
      for (const [id, ingredient] of articles) {
        const heading = /^#\s+(.+)$/m.exec(await reader.read(ingredient.key))?.[1]?.trim();
        titles.push(title('word', id, heading ?? id.split('/').at(-1) ?? id));
      }
      return {
        books: [],
        items: articles.size,
        bytes: sizeOf(
          reader,
          [...articles.values()].map((item) => item.key),
        ),
        titles,
      };
    }
    case 'academy': {
      const articles = academyEntries(reader);
      const titles: TitleRow[] = [];
      for (const article of articles.values()) {
        titles.push(title('academy', article.id, (await reader.read(article.titleKey)).trim()));
      }
      const keys = [...articles.values()].flatMap((article) => article.bodyKeys);
      return { books: [], items: articles.size, bytes: sizeOf(reader, keys), titles };
    }
    case 'stories': {
      const stories = storyKeys(reader);
      const titles: TitleRow[] = [];
      for (const [story, key] of stories) {
        titles.push(title('story', String(story), storyTitle(await reader.read(key))));
      }
      return { books: [], items: stories.size, bytes: sizeOf(reader, stories.values()), titles };
    }
    case 'movements':
      return { books: [], items: movementKeys(reader).size, bytes: 0, titles: [] };
    case 'audio': {
      const clips = audioEntries(reader);
      return {
        books: [...new Set(clips.map((clip) => clip.book))],
        items: clips.length,
        bytes: 0,
        titles: [],
      };
    }
    case 'images':
      return { books: [], items: imageKeys(reader).size, bytes: 0, titles: [] };
  }
}

export async function analyze(
  pack: string,
  burrito: CorpusBurrito,
  reader: BurritoReader,
): Promise<Analysis | undefined> {
  const licenceKey = licenceKeyOf(reader.ingredients.map((ingredient) => ingredient.key));
  const licenceText = licenceKey === undefined ? undefined : await reader.read(licenceKey);
  const provenance = provenanceOf(burrito, reader.metadata, licenceText);
  if (provenance === undefined) {
    return undefined;
  }
  const kind = kindOf(pack, burrito, reader);
  const { books, bookNames = {}, items, bytes, titles } = await counted(kind, reader, burrito.language);
  return {
    entry: {
      root: burrito.root,
      pack,
      rowId: burrito.row,
      kind,
      language: burrito.language,
      direction: reader.direction,
      provenance,
      books,
      bookNames,
      items,
      bytes,
    },
    titles,
  };
}
