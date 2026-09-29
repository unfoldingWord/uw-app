import { comparePublishers, compareText } from '../order';
import type { Files } from '../ports';
import { openBurrito, type BurritoReader } from './source';
import type { Entry, IndexRow, TitleRow } from './tables';
import type { CorpusKind, IndexStatus, LinkTarget } from './types';

export type Library = {
  all(): readonly Entry[];
  of(language: string, kinds: readonly CorpusKind[]): readonly Entry[];
  byRoot(root: string): Entry | undefined;
  titles(language: string): readonly TitleRow[];
  titlesOf(root: string): readonly TitleRow[];
  titleOf(language: string, target: LinkTarget): string | undefined;
  reader(entry: Entry): Promise<BurritoReader>;
  cached<T>(entry: Entry, key: string, load: (reader: BurritoReader) => Promise<T>): Promise<T>;
  put(entries: readonly Entry[], titles: readonly TitleRow[]): void;
  remove(roots: readonly string[]): void;
  index(language: string): IndexStatus;
  indexRow(language: string): IndexRow | undefined;
  setIndex(row: IndexRow | { readonly language: string; readonly built: false }): void;
  indexes(): readonly IndexRow[];
};

export const noIndex: IndexStatus = Object.freeze({ built: false, entries: 0, bytes: 0 });

export const bookCacheEntries = 4;

export const bookCacheBytes = 32 * 1024 * 1024;

export const smallCacheEntries = 256;

const bookScoped = /^(usfm|notes|links|questions):/;

function preference(left: Entry, right: Entry): number {
  return (
    comparePublishers(left.provenance.publisher, right.provenance.publisher) ||
    compareText(left.root, right.root)
  );
}

function targetKey(target: LinkTarget): string {
  switch (target.kind) {
    case 'article':
      return target.id;
    case 'story':
      return String(target.story);
    case 'passage':
      return target.reference;
  }
}

type Lru = {
  get(key: string): Promise<unknown> | undefined;
  set(key: string, value: Promise<unknown>, weight: number): void;
  delete(key: string): void;
  forgetRoot(root: string): void;
};

const separator = '\u0000';

type Held = { readonly value: Promise<unknown>; readonly weight: number };

function createLru(limit: number, budget: number): Lru {
  const items = new Map<string, Held>();
  let total = 0;
  const drop = (key: string): void => {
    const held = items.get(key);
    if (held !== undefined) {
      total -= held.weight;
      items.delete(key);
    }
  };
  return {
    get(key) {
      const found = items.get(key);
      if (found !== undefined) {
        items.delete(key);
        items.set(key, found);
      }
      return found?.value;
    },
    set(key, value, weight) {
      drop(key);
      items.set(key, { value, weight });
      total += weight;
      while (items.size > 1 && (items.size > limit || total > budget)) {
        const [oldest] = items.keys();
        if (oldest === undefined) {
          return;
        }
        drop(oldest);
      }
    },
    delete: drop,
    forgetRoot(root) {
      for (const key of [...items.keys()]) {
        if (key.startsWith(`${root}${separator}`)) {
          drop(key);
        }
      }
    },
  };
}

function weightOf(reader: BurritoReader, key: string): number {
  const book = key.slice(key.indexOf(':') + 1);
  return reader.ingredients
    .filter((ingredient) => Object.keys(ingredient.entry.scope ?? {}).includes(book))
    .reduce((sum, ingredient) => sum + ingredient.entry.size, 0);
}

export function createLibrary(files: Files): Library {
  const entries = new Map<string, Entry>();
  const titles = new Map<string, readonly TitleRow[]>();
  const readers = new Map<string, Promise<BurritoReader>>();
  const books = createLru(bookCacheEntries, bookCacheBytes);
  const small = createLru(smallCacheEntries, Number.POSITIVE_INFINITY);
  const indexRows = new Map<string, IndexRow>();
  const titlesByLanguage = new Map<string, readonly TitleRow[]>();
  const titleIndex = new Map<string, ReadonlyMap<string, string>>();

  const invalidate = (): void => {
    titlesByLanguage.clear();
    titleIndex.clear();
  };

  const forget = (root: string): void => {
    entries.delete(root);
    titles.delete(root);
    readers.delete(root);
    books.forgetRoot(root);
    small.forgetRoot(root);
  };

  const languageTitles = (language: string): readonly TitleRow[] => {
    const known = titlesByLanguage.get(language);
    if (known !== undefined) {
      return known;
    }
    const found = [...titles.entries()]
      .flatMap(([root, rows]) => {
        const entry = entries.get(root);
        return entry?.language === language ? [{ entry, rows }] : [];
      })
      .sort((left, right) => preference(left.entry, right.entry))
      .flatMap(({ rows }) => rows);
    titlesByLanguage.set(language, found);
    return found;
  };

  const library: Library = {
    all: () => [...entries.values()],
    of: (language, kinds) =>
      [...entries.values()]
        .filter((entry) => entry.language === language && kinds.includes(entry.kind))
        .sort(preference),
    byRoot: (root) => entries.get(root),
    titles: languageTitles,
    titlesOf: (root) => titles.get(root) ?? [],
    titleOf: (language, target) => {
      let index = titleIndex.get(language);
      if (index === undefined) {
        const built = new Map<string, string>();
        for (const row of languageTitles(language)) {
          if (!built.has(row.target)) {
            built.set(row.target, row.title);
          }
        }
        index = built;
        titleIndex.set(language, built);
      }
      return index.get(targetKey(target));
    },
    reader: (entry) => {
      const known = readers.get(entry.root);
      if (known !== undefined) {
        return known;
      }
      const opened = openBurrito(files, entry.root).then((reader) => {
        if (reader === undefined) {
          throw new Error(`${entry.root} has no readable metadata`);
        }
        return reader;
      });
      readers.set(entry.root, opened);
      opened.catch(() => readers.delete(entry.root));
      return opened;
    },
    cached: <T>(entry: Entry, key: string, load: (reader: BurritoReader) => Promise<T>): Promise<T> => {
      const heavy = bookScoped.test(key);
      const cache = heavy ? books : small;
      const id = `${entry.root}${separator}${key}`;
      const known = cache.get(id);
      if (known !== undefined) {
        return known as Promise<T>;
      }
      const opened = library.reader(entry);
      const loading = opened.then(load);
      cache.set(id, loading, 0);
      void opened.then(
        (reader) => {
          if (heavy && cache.get(id) === loading) {
            cache.set(id, loading, weightOf(reader, key));
          }
        },
        () => undefined,
      );
      loading.catch(() => cache.delete(id));
      return loading;
    },
    put: (added, addedTitles) => {
      for (const entry of added) {
        forget(entry.root);
        entries.set(entry.root, entry);
        titles.set(
          entry.root,
          addedTitles.filter((title) => title.root === entry.root),
        );
      }
      invalidate();
    },
    remove: (roots) => {
      roots.forEach(forget);
      invalidate();
    },
    index: (language) => {
      const row = indexRows.get(language);
      return row === undefined ? noIndex : { built: true, entries: row.entries, bytes: row.bytes };
    },
    indexRow: (language) => indexRows.get(language),
    setIndex: (row) => {
      if (row.built) {
        indexRows.set(row.language, row);
      } else {
        indexRows.delete(row.language);
      }
    },
    indexes: () => [...indexRows.values()].sort((left, right) => compareText(left.language, right.language)),
  };
  return library;
}
