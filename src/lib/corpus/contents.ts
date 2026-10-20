import { bookByCode } from '../domain/books';
import { compareText } from '../order';
import type { Library } from './library';
import { readingOfKind } from './readings';
import { academyManuals, academyOrder, audioClips, movementStories, stories } from './loaders';
import type { Contents } from './types';

function chaptersInScope(code: string, scoped: readonly string[]): number[] {
  const listed = scoped.map(Number).filter((chapter) => Number.isInteger(chapter) && chapter > 0);
  if (listed.length > 0) {
    return listed;
  }
  return Array.from({ length: bookByCode(code)?.chapters ?? 0 }, (_, index) => index + 1);
}

const remembered = new WeakMap<Library, Map<string, { generation: number; contents: Promise<Contents> }>>();

export function contentsOf(library: Library, language: string): Promise<Contents> {
  const known =
    remembered.get(library) ?? new Map<string, { generation: number; contents: Promise<Contents> }>();
  remembered.set(library, known);
  const held = known.get(language);
  if (held !== undefined && held.generation === library.generation()) {
    return held.contents;
  }
  const contents = buildContents(library, language);
  known.set(language, { generation: library.generation(), contents });
  contents.catch(() => {
    if (known.get(language)?.contents === contents) {
      known.delete(language);
    }
  });
  return contents;
}

async function buildContents(library: Library, language: string): Promise<Contents> {
  const texts = [];
  for (const entry of library.of(language, ['literal', 'simplified', 'original'])) {
    const reader = await library.reader(entry);
    const scope = reader.metadata.type.flavorType.currentScope ?? {};
    texts.push({
      reading: readingOfKind(entry.kind),
      books: entry.books.map((code) => ({
        code,
        chapters: chaptersInScope(code, scope[code] ?? []),
      })),
      provenance: entry.provenance,
    });
  }
  const titles = library.titles(language);
  const articleEntries = (kind: 'word' | 'academy') =>
    titles.filter((row) => row.kind === kind).map((row) => ({ id: row.target, title: row.title }));
  const [academy] = library.of(language, ['academy']);
  const order = academy === undefined ? [] : await academyOrder(library, academy);
  const position = new Map<string, number>();
  order.forEach((id, index) => {
    if (!position.has(id)) {
      position.set(id, index);
    }
  });
  const manuals =
    academy === undefined
      ? []
      : (await academyManuals(library, academy)).map(({ manual, title }) => ({ manual, title }));
  const [storyEntry] = library.of(language, ['stories']);
  const storyList = storyEntry === undefined ? [] : [...(await stories(library, storyEntry)).values()];
  const [movementEntry] = library.of(language, ['movements']);
  const audio = [];
  for (const entry of library.of(language, ['audio'])) {
    audio.push(
      ...(await audioClips(library, entry)).map((clip) => ({ book: clip.book, chapter: clip.chapter })),
    );
  }
  return {
    language,
    texts,
    words: articleEntries('word').sort((left, right) => compareText(left.id, right.id)),
    academy: articleEntries('academy').sort(
      (left, right) => (position.get(left.id) ?? -1) - (position.get(right.id) ?? -1),
    ),
    manuals,
    stories: storyList.map((story) => ({ number: story.number, title: story.title })),
    movements: movementEntry === undefined ? [] : await movementStories(library, movementEntry),
    audio,
  };
}
