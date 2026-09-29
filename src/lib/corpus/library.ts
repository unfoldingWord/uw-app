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
  titleOf(language: string, target: LinkTarget): string | undefined;
  reader(entry: Entry): Promise<BurritoReader>;
  cached<T>(entry: Entry, key: string, load: (reader: BurritoReader) => Promise<T>): Promise<T>;
  put(entries: readonly Entry[], titles: readonly TitleRow[]): void;
  remove(roots: readonly string[]): void;
  index(language: string): IndexStatus;
  setIndex(row: IndexRow | { readonly language: string; readonly built: false }): void;
  indexes(): readonly IndexRow[];
};

export const noIndex: IndexStatus = Object.freeze({ built: false, entries: 0, bytes: 0 });

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

export function createLibrary(files: Files): Library {
  const entries = new Map<string, Entry>();
  const titles = new Map<string, readonly TitleRow[]>();
  const readers = new Map<string, Promise<BurritoReader>>();
  const caches = new Map<string, Map<string, Promise<unknown>>>();
  const indexRows = new Map<string, IndexRow>();

  const forget = (root: string): void => {
    entries.delete(root);
    titles.delete(root);
    readers.delete(root);
    caches.delete(root);
  };

  const library: Library = {
    all: () => [...entries.values()],
    of: (language, kinds) =>
      [...entries.values()]
        .filter((entry) => entry.language === language && kinds.includes(entry.kind))
        .sort(preference),
    byRoot: (root) => entries.get(root),
    titles: (language) =>
      [...titles.entries()]
        .filter(([root]) => entries.get(root)?.language === language)
        .sort(([left], [right]) => {
          const leftEntry = entries.get(left);
          const rightEntry = entries.get(right);
          return leftEntry && rightEntry ? preference(leftEntry, rightEntry) : 0;
        })
        .flatMap(([, rows]) => rows),
    titleOf: (language, target) => {
      const key = targetKey(target);
      return library.titles(language).find((row) => row.target === key)?.title;
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
      const cache = caches.get(entry.root) ?? new Map<string, Promise<unknown>>();
      caches.set(entry.root, cache);
      const known = cache.get(key);
      if (known !== undefined) {
        return known as Promise<T>;
      }
      const loading = library.reader(entry).then(load);
      cache.set(key, loading);
      loading.catch(() => cache.delete(key));
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
    },
    remove: (roots) => roots.forEach(forget),
    index: (language) => {
      const row = indexRows.get(language);
      return row === undefined ? noIndex : { built: true, entries: row.entries, bytes: row.bytes };
    },
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
