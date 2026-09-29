import { checkEvent, isEventType, payloadProblem, type EventInput } from '../domain/events';
import { failureCodeOf, type FailureCode, type FailureContext } from '../domain/failures';
import { deepFreeze } from '../json';
import type { Clock, Db, Row } from '../ports';
import type { JournalEntry, JournalStats } from './entry';
import { journalFormat, journalVersion, type JournalExport } from './export';

export const defaultJournalLimit = 5000;

export const journalTables = ['journal', 'journal_state'] as const;

export type EventDraft = EventInput | ((at: number) => EventInput);

export type Journal = {
  load(): Promise<void>;
  append(draft: EventDraft): Promise<JournalEntry | undefined>;
  read(since?: number): readonly JournalEntry[];
  stats(): JournalStats;
  export(): JournalExport;
};

export type JournalOptions = {
  db: Db;
  clock: Clock;
  limit?: number;
  onEntry?: (entry: JournalEntry) => void;
};

function entryFromRow(row: Row): JournalEntry | undefined {
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

export function createJournal(options: JournalOptions): Journal {
  const { db, clock } = options;
  const limit = Math.max(1, Math.floor(options.limit ?? defaultJournalLimit));
  let entries: JournalEntry[] = [];
  let pending: JournalEntry[] = [];
  let lastSeq = 0;
  let dropped = 0;
  let writing: Promise<void> = Promise.resolve();
  let refusing = false;

  function record(input: EventInput, at: number): JournalEntry {
    lastSeq += 1;
    const entry = deepFreeze({ ...structuredCopy(input), at, seq: lastSeq } as JournalEntry);
    entries.push(entry);
    pending.push(entry);
    if (entries.length > limit) {
      const excess = entries.length - limit;
      dropped += excess;
      entries = entries.slice(excess);
      const oldestKept = entries[0]?.seq ?? lastSeq;
      pending = pending.filter((item) => item.seq >= oldestKept);
    }
    options.onEntry?.(entry);
    return entry;
  }

  function recordFailure(code: FailureCode, context: FailureContext, at = clock.now()): JournalEntry {
    return record({ type: 'Failure', payload: { code, context } }, at);
  }

  async function persist(): Promise<void> {
    const batch = pending;
    if (batch.length === 0) {
      return;
    }
    try {
      await db.transaction(async (session) => {
        for (const entry of batch) {
          await session.run('INSERT OR REPLACE INTO journal (seq, type, at, payload) VALUES (?, ?, ?, ?)', [
            entry.seq,
            entry.type,
            entry.at,
            JSON.stringify(entry.payload),
          ]);
        }
        await session.run('DELETE FROM journal WHERE seq <= ?', [lastSeq - limit]);
        await session.run(
          "INSERT INTO journal_state (key, value) VALUES ('dropped', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
          [dropped],
        );
      });
      pending = pending.filter((entry) => !batch.includes(entry));
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

  function draftAt(draft: EventDraft): { input: EventInput; at: number } {
    const at = clock.now();
    return { input: typeof draft === 'function' ? draft(at) : draft, at };
  }

  return {
    async load() {
      try {
        const rows = await db.all('SELECT seq, type, at, payload FROM journal ORDER BY seq');
        const state = await db.get("SELECT value FROM journal_state WHERE key = 'dropped'");
        const loaded = rows.flatMap((row) => entryFromRow(row) ?? []);
        entries = [...loaded.slice(-limit), ...entries];
        lastSeq = Math.max(
          lastSeq,
          rows.reduce((max, row) => Math.max(max, Number(row.seq)), 0),
        );
        dropped += (typeof state?.value === 'number' ? state.value : 0) + Math.max(0, loaded.length - limit);
        if (loaded.length < rows.length) {
          recordFailure('journal.import-invalid', { rows: rows.length - loaded.length });
          await flush();
        }
      } catch (error) {
        recordFailure('db.io', { cause: failureCodeOf(error) });
      }
    },

    async append(draft) {
      const { input, at } = draftAt(draft);
      const type: unknown = input.type;
      const problem = isEventType(type) ? payloadProblem(type, input.payload) : 'unknown type';
      if (problem !== undefined) {
        recordFailure('journal.event-rejected', { type: isEventType(type) ? type : 'unknown' }, at);
        await flush();
        return undefined;
      }
      const entry = record(input, at);
      await flush();
      return entry;
    },

    read(since = 0) {
      return Object.freeze(entries.filter((entry) => entry.seq > since));
    },

    stats() {
      return { limit, size: entries.length, dropped, lastSeq, unpersisted: pending.length };
    },

    export() {
      return { format: journalFormat, version: journalVersion, limit, dropped, events: entries.slice() };
    },
  };
}

function structuredCopy(input: EventInput): EventInput {
  return JSON.parse(JSON.stringify({ type: input.type, payload: input.payload })) as EventInput;
}
