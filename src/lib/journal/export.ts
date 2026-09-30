import { checkEvent } from '../domain/events';
import type { JsonValue } from '../json';
import type { JournalEntry } from './entry';

export const journalFormat = 'unfoldingword-journal';

export const journalVersion = 2;

export type JournalBaseline = Readonly<Record<string, JsonValue>>;

export type JournalExport = {
  format: typeof journalFormat;
  version: typeof journalVersion;
  limit: number;
  dropped: number;
  baseline: JournalBaseline;
  events: readonly JournalEntry[];
};

export type ParsedJournal = { ok: true; journal: JournalExport } | { ok: false; reason: string };

function isCount(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}

function isBaseline(value: unknown): value is JournalBaseline {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseEntries(values: readonly unknown[]): JournalEntry[] | string {
  const entries: JournalEntry[] = [];
  for (const [index, value] of values.entries()) {
    const seq = (value as { seq?: unknown } | null)?.seq;
    if (!isCount(seq) || seq <= (entries.at(-1)?.seq ?? 0)) {
      return `event ${index} has no increasing seq`;
    }
    const checked = checkEvent(value);
    if (!checked.ok) {
      return `event ${index}: ${checked.reason}`;
    }
    entries.push({ ...checked.event, seq });
  }
  return entries;
}

export function parseJournalExport(value: unknown): ParsedJournal {
  if (typeof value !== 'object' || value === null) {
    return { ok: false, reason: 'the journal is not an object' };
  }
  const record = value as Record<string, unknown>;
  if (record.format !== journalFormat || record.version !== journalVersion) {
    return { ok: false, reason: `not a ${journalFormat} document of version ${journalVersion}` };
  }
  if (!isCount(record.limit) || record.limit < 1 || !isCount(record.dropped)) {
    return { ok: false, reason: 'the journal has no limit or dropped count' };
  }
  if (!isBaseline(record.baseline)) {
    return { ok: false, reason: 'the journal has no baseline for the events it dropped' };
  }
  if (!Array.isArray(record.events)) {
    return { ok: false, reason: 'the journal has no events' };
  }
  const events = parseEntries(record.events);
  if (typeof events === 'string') {
    return { ok: false, reason: events };
  }
  return {
    ok: true,
    journal: {
      format: journalFormat,
      version: journalVersion,
      limit: record.limit,
      dropped: record.dropped,
      baseline: record.baseline,
      events,
    },
  };
}
