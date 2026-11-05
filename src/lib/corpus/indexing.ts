import { failureCodeOf, type FailureCode } from '../domain/failures';
import type { JournalEntry } from '../journal/entry';
import type { EventDraft } from '../journal/journal';
import type { Db } from '../ports';
import { buildIndex, estimateIndex, hasIndexedText } from './fulltext';
import type { Library } from './library';
import { clearIndex, loadIndexes, loadWanted, setWanted } from './tables';
import type { IndexState, IndexStatus } from './types';

export type Indexing = {
  start(): Promise<void>;
  wanted(language: string): boolean;
  wantedLanguages(): readonly string[];
  state(language: string): IndexState;
  onChange(listener: (language: string) => void): () => void;
  reindex(language: string): Promise<IndexStatus>;
  refresh(languages: Iterable<string>): Promise<void>;
  drop(language: string): Promise<void>;
};

type IndexingContext = {
  library: Library;
  db: Db;
  emit(draft: EventDraft): Promise<JournalEntry | undefined>;
};

type Building = { readonly language: string; readonly done: number; readonly total: number };

const unfinishedPercent = 99;

function percentOf(building: Building): number {
  return Math.min(unfinishedPercent, Math.floor((building.done / building.total) * 100));
}

export function createIndexing({ library, db, emit }: IndexingContext): Indexing {
  const wanted = new Set<string>();
  const waiting = new Set<string>();
  const failures = new Map<string, FailureCode>();
  const listeners = new Set<(language: string) => void>();
  let building: Building | undefined;
  let chain: Promise<unknown> = Promise.resolve();

  const queued = <T>(task: () => Promise<T>): Promise<T> => {
    const result = chain.then(task, task);
    chain = result.catch(() => undefined);
    return result;
  };

  const changed = (language: string): void => {
    for (const listener of [...listeners]) {
      listener(language);
    }
  };

  const clear = async (language: string): Promise<void> => {
    if (library.indexRow(language) === undefined) {
      return;
    }
    await db.transaction((transaction) => clearIndex(transaction, language));
    library.setIndex({ language, built: false });
  };

  const build = async (language: string): Promise<boolean> => {
    failures.delete(language);
    const total = Math.max(1, estimateIndex(library, language).entries);
    building = { language, done: 0, total };
    changed(language);
    try {
      const row = await buildIndex(library, db, language, library.indexRow(language), (done) => {
        building = { language, done, total };
        changed(language);
      });
      library.setIndex(row);
      building = undefined;
      await emit({ type: 'IndexBuilt', payload: { language, entries: row.entries, bytes: row.bytes } });
      return true;
    } catch (error) {
      const code = failureCodeOf(error);
      failures.set(language, code);
      building = undefined;
      await emit({ type: 'Failure', payload: { code, context: { language } } });
      return false;
    } finally {
      building = undefined;
      changed(language);
    }
  };

  const adopt = async (language: string): Promise<void> => {
    if (wanted.has(language) || wanted.size === 0 || !hasIndexedText(library, language)) {
      return;
    }
    try {
      await db.transaction((transaction) => setWanted(transaction, language, true));
      wanted.add(language);
    } catch (error) {
      const code = failureCodeOf(error);
      failures.set(language, code);
      await emit({ type: 'Failure', payload: { code, context: { language } } });
      changed(language);
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
    wanted: (language) => wanted.has(language) || waiting.has(language),
    wantedLanguages: () => [...wanted].sort(),
    state(language) {
      if (building?.language === language) {
        return { state: 'building', percent: percentOf(building) };
      }
      if (waiting.has(language)) {
        return { state: 'waiting' };
      }
      const code = failures.get(language);
      if (code !== undefined) {
        return { state: 'failed', code };
      }
      return library.index(language).built ? { state: 'built' } : { state: 'off' };
    },
    onChange(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    reindex(language) {
      waiting.add(language);
      changed(language);
      const started = emit({ type: 'IndexStarted', payload: { language } });
      return queued(async () => {
        try {
          await started;
          await db.transaction((transaction) => setWanted(transaction, language, true));
        } catch (error) {
          waiting.delete(language);
          changed(language);
          throw error;
        }
        waiting.delete(language);
        wanted.add(language);
        await build(language);
        return library.index(language);
      });
    },
    refresh: (languages) =>
      queued(async () => {
        for (const language of new Set(languages)) {
          await adopt(language);
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
        failures.delete(language);
        library.setIndex({ language, built: false });
        changed(language);
      });
    },
  };
}
