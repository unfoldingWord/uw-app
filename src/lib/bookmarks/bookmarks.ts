import { bookmarkTargets } from '../domain/events';
import { fieldValidators } from '../domain/fields';
import type { JsonValue } from '../json';
import { defineModule } from '../module';
import type { DbRow } from '../ports';

export type BookmarkTarget =
  | { readonly target: 'passage'; readonly reference: string; readonly language: string }
  | { readonly target: 'article'; readonly article: string; readonly language: string }
  | { readonly target: 'story'; readonly story: number; readonly language: string };

export type Bookmark = BookmarkTarget & { readonly id: string };

export type BookmarksApi = {
  list(): readonly Bookmark[];
  find(target: BookmarkTarget): Bookmark | undefined;
  add(target: BookmarkTarget): Promise<Bookmark | undefined>;
  remove(id: string): Promise<boolean>;
  onChange(listener: () => void): () => void;
};

export const bookmarkTables: readonly string[] = ['bookmarks'];

type Stored = Bookmark & { readonly ordinal: number };

function isValidTarget(target: BookmarkTarget): boolean {
  if (!fieldValidators.language(target.language)) {
    return false;
  }
  switch (target.target) {
    case 'passage':
      return fieldValidators.reference(target.reference);
    case 'article':
      return fieldValidators.article(target.article);
    case 'story':
      return fieldValidators.story(target.story);
  }
}

function sameTarget(left: BookmarkTarget, right: BookmarkTarget): boolean {
  if (left.language !== right.language) {
    return false;
  }
  switch (left.target) {
    case 'passage':
      return right.target === 'passage' && right.reference === left.reference;
    case 'article':
      return right.target === 'article' && right.article === left.article;
    case 'story':
      return right.target === 'story' && right.story === left.story;
  }
}

function text(row: DbRow, column: string): string | undefined {
  const value = row[column];
  return typeof value === 'string' ? value : undefined;
}

function whole(row: DbRow, column: string): number | undefined {
  const value = row[column];
  return typeof value === 'number' ? value : undefined;
}

function storedOf(row: DbRow): Stored | undefined {
  const id = text(row, 'id');
  const ordinal = whole(row, 'ordinal');
  const language = text(row, 'language');
  const target = bookmarkTargets.find((candidate) => candidate === text(row, 'target'));
  if (id === undefined || ordinal === undefined || language === undefined || target === undefined) {
    return undefined;
  }
  const reference = text(row, 'reference');
  const article = text(row, 'article');
  const story = whole(row, 'story');
  let bookmark: BookmarkTarget | undefined;
  if (target === 'passage' && reference !== undefined) {
    bookmark = { target, reference, language };
  } else if (target === 'article' && article !== undefined) {
    bookmark = { target, article, language };
  } else if (target === 'story' && story !== undefined) {
    bookmark = { target, story, language };
  }
  return bookmark === undefined || !isValidTarget(bookmark) ? undefined : { ...bookmark, id, ordinal };
}

function targetOf(bookmark: Bookmark): BookmarkTarget {
  switch (bookmark.target) {
    case 'passage':
      return { target: 'passage', reference: bookmark.reference, language: bookmark.language };
    case 'article':
      return { target: 'article', article: bookmark.article, language: bookmark.language };
    case 'story':
      return { target: 'story', story: bookmark.story, language: bookmark.language };
  }
}

function publicBookmark(stored: Stored): Bookmark {
  return { ...targetOf(stored), id: stored.id };
}

function payloadOf(bookmark: Bookmark) {
  switch (bookmark.target) {
    case 'passage':
      return {
        bookmark: bookmark.id,
        target: bookmark.target,
        reference: bookmark.reference,
        language: bookmark.language,
      };
    case 'article':
      return {
        bookmark: bookmark.id,
        target: bookmark.target,
        article: bookmark.article,
        language: bookmark.language,
      };
    case 'story':
      return {
        bookmark: bookmark.id,
        target: bookmark.target,
        story: bookmark.story,
        language: bookmark.language,
      };
  }
}

export const bookmarksModule = defineModule<BookmarksApi>({
  events: ['BookmarkAdded', 'BookmarkRemoved'],
  owns: { tables: bookmarkTables, directories: [], keys: [] },
  create(context) {
    const { db, ids } = context.ports;
    const saved = new Map<string, Stored>();
    const listeners = new Set<() => void>();

    const ordered = (): Stored[] => [...saved.values()].sort((left, right) => right.ordinal - left.ordinal);

    const notify = (): void => {
      for (const listener of listeners) {
        listener();
      }
    };

    const find = (target: BookmarkTarget): Stored | undefined =>
      [...saved.values()].find((stored) => sameTarget(stored, target));

    const add = async (target: BookmarkTarget): Promise<Bookmark | undefined> => {
      if (!isValidTarget(target)) {
        return undefined;
      }
      const existing = find(target);
      if (existing !== undefined) {
        return publicBookmark(existing);
      }
      const ordinal = Math.max(0, ...[...saved.values()].map((stored) => stored.ordinal)) + 1;
      const bookmark: Bookmark = { ...target, id: ids.next() };
      await context.emit({ type: 'BookmarkAdded', payload: payloadOf(bookmark) });
      const stored: Stored = { ...bookmark, ordinal };
      await db.run(
        'INSERT OR REPLACE INTO bookmarks (id, ordinal, target, reference, article, story, language) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [
          stored.id,
          ordinal,
          stored.target,
          stored.target === 'passage' ? stored.reference : null,
          stored.target === 'article' ? stored.article : null,
          stored.target === 'story' ? stored.story : null,
          stored.language,
        ],
      );
      saved.set(stored.id, stored);
      notify();
      return bookmark;
    };

    const remove = async (id: string): Promise<boolean> => {
      if (!saved.has(id)) {
        return false;
      }
      await context.emit({ type: 'BookmarkRemoved', payload: { bookmark: id } });
      await db.run('DELETE FROM bookmarks WHERE id = ?', [id]);
      saved.delete(id);
      notify();
      return true;
    };

    const api: BookmarksApi = {
      list: () => ordered().map(publicBookmark),
      find: (target) => {
        const stored = find(target);
        return stored === undefined ? undefined : publicBookmark(stored);
      },
      add,
      remove,
      onChange(listener) {
        listeners.add(listener);
        return () => {
          listeners.delete(listener);
        };
      },
    };

    return {
      api,
      async start() {
        for (const row of await db.all('SELECT * FROM bookmarks')) {
          const stored = storedOf(row);
          if (stored !== undefined) {
            saved.set(stored.id, stored);
          }
        }
      },
      snapshot(): JsonValue {
        return {
          bookmarks: ordered().map(targetOf),
        };
      },
      redo: {
        BookmarkAdded: async (event) => {
          const { target, reference, article, story, language } = event.payload;
          if (target === 'passage' && reference !== undefined) {
            await add({ target, reference, language });
          } else if (target === 'article' && article !== undefined) {
            await add({ target, article, language });
          } else if (target === 'story' && story !== undefined) {
            await add({ target, story, language });
          }
        },
        BookmarkRemoved: async (event) => {
          await remove(event.payload.bookmark);
        },
      },
    };
  },
});
