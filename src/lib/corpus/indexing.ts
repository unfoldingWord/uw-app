import { failureCodeOf } from '../domain/failures';
import type { JournalEntry } from '../journal/entry';
import type { EventDraft } from '../journal/journal';
import type { Db } from '../ports';
import { buildIndex, hasIndexedText } from './fulltext';
import type { Library } from './library';
import { clearIndex, loadIndexes, loadWanted, setWanted } from './tables';
import type { IndexStatus } from './types';

export type Indexing = {
  start(): Promise<void>;
  wanted(language: string): boolean;
  reindex(language: string): Promise<IndexStatus>;
  refresh(languages: Iterable<string>): Promise<void>;
  drop(language: string): Promise<void>;
};

type IndexingContext = {
  library: Library;
  db: Db;
  emit(draft: EventDraft): Promise<JournalEntry | undefined>;
};

export function createIndexing({ library, db, emit }: IndexingContext): Indexing {
  const wanted = new Set<string>();
  let chain: Promise<unknown> = Promise.resolve();

  const queued = <T>(task: () => Promise<T>): Promise<T> => {
    const result = chain.then(task, task);
    chain = result.catch(() => undefined);
    return result;
  };

  const clear = async (language: string): Promise<void> => {
    if (library.indexRow(language) === undefined) {
      return;
    }
    await db.transaction((transaction) => clearIndex(transaction, language));
    library.setIndex({ language, built: false });
  };

  const build = async (language: string): Promise<boolean> => {
    try {
      const row = await buildIndex(library, db, language, library.indexRow(language));
      library.setIndex(row);
      await emit({ type: 'IndexBuilt', payload: { language, entries: row.entries, bytes: row.bytes } });
      return true;
    } catch (error) {
      await emit({ type: 'Failure', payload: { code: failureCodeOf(error), context: { language } } });
      return false;
    }
  };

  return {
    async start() {
      for (const row of await loadIndexes(db)) {
        library.setIndex(row);
      }
      for (const language of await loadWanted(db)) {
        wanted.add(language);
      }
    },
    wanted: (language) => wanted.has(language),
    async reindex(language) {
      await emit({ type: 'IndexStarted', payload: { language } });
      return queued(async () => {
        await db.transaction((transaction) => setWanted(transaction, language, true));
        wanted.add(language);
        await build(language);
        return library.index(language);
      });
    },
    refresh: (languages) =>
      queued(async () => {
        for (const language of new Set(languages)) {
          if (!wanted.has(language)) {
            await clear(language);
          } else if (hasIndexedText(library, language)) {
            await build(language);
          } else {
            await clear(language);
          }
        }
      }),
    async drop(language) {
      await emit({ type: 'IndexDropped', payload: { language } });
      await queued(async () => {
        await db.transaction(async (transaction) => {
          await setWanted(transaction, language, false);
          await clearIndex(transaction, language);
        });
        wanted.delete(language);
        library.setIndex({ language, built: false });
      });
    },
  };
}
