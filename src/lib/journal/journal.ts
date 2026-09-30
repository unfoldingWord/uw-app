import { checkEvent, isEventType, payloadProblem, type DomainEvent, type EventInput } from '../domain/events';
import { failureCodeOf, type FailureCode, type FailureContext } from '../domain/failures';
import { deepFreeze, type JsonValue } from '../json';
import type { Clock, Db, DbRow } from '../ports';
import type { JournalEntry, JournalStats } from './entry';
import { journalFormat, journalVersion, type JournalBaseline, type JournalExport } from './export';

export const defaultJournalLimit = 5000;

export const journalTables = ['journal', 'journal_state', 'journal_baseline'] as const;

export type EventDraft = EventInput | ((at: number) => EventInput);

export type Journal = {
  load(): Promise<void>;
  append(draft: EventDraft): Promise<JournalEntry | undefined>;
  read(since?: number): readonly JournalEntry[];
  baseline(): JournalBaseline;
  stats(): JournalStats;
  export(): JournalExport;
};

export type JournalCheckpoint = {
  initial: JournalBaseline;
  step(state: JournalBaseline, event: DomainEvent): JournalBaseline;
};

export type JournalResume = { seq: number; dropped: number; baseline: JournalBaseline };

export type JournalReaction = (entry: JournalEntry) => void | Promise<void>;

export type JournalOptions = {
  db: Db;
  clock: Clock;
  limit?: number;
  checkpoint?: JournalCheckpoint;
  resume?: JournalResume;
  onEntry?: JournalReaction;
};

const emptyCheckpoint: JournalCheckpoint = { initial: {}, step: (state) => state };

function entryFromRow(row: DbRow): JournalEntry | undefined {
  const { seq, type, at, payload } = row;
  if (typeof seq !== 'number' || typeof payload !== 'string') {
    return undefined;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(payload);
  } catch {
    return undefined;
  }
  const checked = checkEvent({ type, at, payload: parsed });
  return checked.ok ? deepFreeze({ ...checked.event, seq }) : undefined;
}

function baselineFromRows(rows: readonly DbRow[], initial: JournalBaseline): JournalBaseline {
  const loaded: Record<string, JsonValue> = { ...initial };
  for (const row of rows) {
    if (typeof row.module !== 'string' || typeof row.state !== 'string' || !(row.module in initial)) {
      continue;
    }
    try {
      loaded[row.module] = JSON.parse(row.state) as JsonValue;
    } catch {
      continue;
    }
  }
  return loaded;
}

export function createJournal(options: JournalOptions): Journal {
  const { db, clock } = options;
  const limit = Math.max(1, Math.floor(options.limit ?? defaultJournalLimit));
  const checkpoint = options.checkpoint ?? emptyCheckpoint;
  let entries: JournalEntry[] = [];
  let pending: JournalEntry[] = [];
  let lastSeq = 0;
  let dropped = 0;
  let baseline: JournalBaseline = checkpoint.initial;
  let baselineDirty = false;
  let writing: Promise<void> = Promise.resolve();
  let refusing = false;
  let internalReactions: Promise<void>[] = [];
  let markLoaded = (): void => undefined;
  const loaded = new Promise<void>((resolve) => {
    markLoaded = resolve;
  });

  function react(entry: JournalEntry): Promise<void> {
    return Promise.resolve(options.onEntry?.(entry));
  }

  function fold(removed: readonly JournalEntry[]): void {
    if (removed.length === 0) {
      return;
    }
    baseline = removed.reduce(checkpoint.step, baseline);
    baselineDirty = true;
  }

  function record(input: EventInput, at: number): { entry: JournalEntry; reaction: Promise<void> } {
    lastSeq += 1;
    const entry = deepFreeze({ ...structuredCopy(input), at, seq: lastSeq } as JournalEntry);
    entries.push(entry);
    pending.push(entry);
    if (entries.length > limit) {
      const excess = entries.length - limit;
      dropped += excess;
      fold(entries.slice(0, excess));
      entries = entries.slice(excess);
      const oldestKept = entries[0]?.seq ?? lastSeq;
      pending = pending.filter((item) => item.seq >= oldestKept);
    }
    return { entry, reaction: react(entry) };
  }

  function recordFailure(code: FailureCode, context: FailureContext, at = clock.now()): JournalEntry {
    const { entry, reaction } = record({ type: 'Failure', payload: { code, context } }, at);
    internalReactions.push(reaction);
    return entry;
  }

  async function persist(): Promise<void> {
    const batch = pending;
    const writesBaseline = baselineDirty;
    if (batch.length === 0 && !writesBaseline) {
      return;
    }
    try {
      await db.transaction(async (transaction) => {
        for (const entry of batch) {
          await transaction.run('INSERT INTO journal (seq, type, at, payload) VALUES (?, ?, ?, ?)', [
            entry.seq,
            entry.type,
            entry.at,
            JSON.stringify(entry.payload),
          ]);
        }
        await transaction.run('DELETE FROM journal WHERE seq <= ?', [lastSeq - limit]);
        await transaction.run(
          "INSERT INTO journal_state (key, value) VALUES ('dropped', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
          [dropped],
        );
        if (writesBaseline) {
          for (const [module, state] of Object.entries(baseline)) {
            await transaction.run(
              'INSERT INTO journal_baseline (module, state) VALUES (?, ?) ON CONFLICT(module) DO UPDATE SET state = excluded.state',
              [module, JSON.stringify(state)],
            );
          }
        }
      });
      pending = pending.filter((entry) => !batch.includes(entry));
      baselineDirty = baselineDirty && !writesBaseline;
      refusing = false;
    } catch (error) {
      if (!refusing) {
        refusing = true;
        recordFailure('journal.persist-failed', { cause: failureCodeOf(error), unpersisted: pending.length });
      }
    }
  }

  function flush(): Promise<void> {
    writing = writing.then(persist);
    return writing;
  }

  async function settle(own: Promise<void> | undefined): Promise<void> {
    const internal = internalReactions;
    internalReactions = [];
    await Promise.all(own === undefined ? internal : [own, ...internal]);
  }

  function draftAt(draft: EventDraft): { input: EventInput; at: number } {
    const at = clock.now();
    return { input: typeof draft === 'function' ? draft(at) : draft, at };
  }

  async function load(): Promise<void> {
    try {
      const rows = await db.all('SELECT seq, type, at, payload FROM journal ORDER BY seq');
      const state = await db.get("SELECT value FROM journal_state WHERE key = 'dropped'");
      const kept = rows.flatMap((row) => entryFromRow(row) ?? []);
      if (rows.length === 0 && options.resume !== undefined) {
        lastSeq = options.resume.seq;
        dropped = options.resume.dropped;
        baseline = Object.fromEntries(
          Object.entries(checkpoint.initial).map(([module, initial]) => [
            module,
            options.resume?.baseline[module] ?? initial,
          ]),
        );
        baselineDirty = true;
        return;
      }
      baseline = baselineFromRows(
        await db.all('SELECT module, state FROM journal_baseline'),
        checkpoint.initial,
      );
      const overflow = Math.max(0, kept.length - limit);
      fold(kept.slice(0, overflow));
      entries = kept.slice(overflow);
      lastSeq = rows.reduce((max, row) => Math.max(max, Number(row.seq)), 0);
      dropped = (typeof state?.value === 'number' ? state.value : 0) + overflow;
      if (kept.length < rows.length) {
        recordFailure('journal.import-invalid', { rows: rows.length - kept.length });
      }
    } catch (error) {
      recordFailure('db.io', { cause: failureCodeOf(error) });
    } finally {
      markLoaded();
    }
  }

  return {
    async load() {
      await load();
      await flush();
      await settle(undefined);
    },

    async append(draft) {
      await loaded;
      const { input, at } = draftAt(draft);
      const type: unknown = input.type;
      const problem = isEventType(type) ? payloadProblem(type, input.payload) : 'unknown type';
      if (problem !== undefined) {
        recordFailure('journal.event-rejected', isEventType(type) ? { type } : {}, at);
        await flush();
        await settle(undefined);
        return undefined;
      }
      const { entry, reaction } = record(input, at);
      await flush();
      await settle(reaction);
      return entry;
    },

    read(since = 0) {
      return Object.freeze(entries.filter((entry) => entry.seq > since));
    },

    baseline: () => baseline,

    stats() {
      return { limit, size: entries.length, dropped, lastSeq, unpersisted: pending.length };
    },

    export() {
      return {
        format: journalFormat,
        version: journalVersion,
        limit,
        dropped,
        baseline,
        events: entries.slice(),
      };
    },
  };
}

function structuredCopy(input: EventInput): EventInput {
  return JSON.parse(JSON.stringify({ type: input.type, payload: input.payload })) as EventInput;
}
