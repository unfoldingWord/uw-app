import type { DomainEvent, EventType } from '../domain/events';
import type { JournalEntry } from '../journal/entry';
import type { JsonValue } from '../json';
import type { JournalReport } from './payload';

export type Reading = 'included' | 'left-out';

const readingFields: Partial<Record<EventType, readonly string[]>> = {
  PassageOpened: ['reference'],
  ArticleOpened: ['article'],
  StoryOpened: ['story'],
  BookmarkAdded: ['reference', 'article', 'story'],
};

function withoutFields(entry: JournalEntry): JournalEntry {
  const fields = readingFields[entry.type];
  if (fields === undefined) {
    return entry;
  }
  const payload = Object.fromEntries(
    Object.entries(entry.payload).filter(([field]) => !fields.includes(field)),
  );
  return { ...entry, payload } as JournalEntry;
}

type JsonRecord = { readonly [key: string]: JsonValue | undefined };

function isRecord(value: JsonValue | undefined): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function withoutReadingState(
  modules: Readonly<Record<string, JsonValue>>,
): Readonly<Record<string, JsonValue>> {
  const next: Record<string, JsonValue> = { ...modules };
  const { bookmarks, preferences } = modules;
  if (isRecord(bookmarks) && Array.isArray(bookmarks.bookmarks)) {
    next.bookmarks = { count: bookmarks.bookmarks.length };
  }
  if (isRecord(preferences) && 'lastPassage' in preferences) {
    next.preferences = Object.fromEntries(
      Object.entries(preferences).filter(
        (entry): entry is [string, JsonValue] => entry[0] !== 'lastPassage' && entry[1] !== undefined,
      ),
    );
  }
  return next;
}

export function leaveOutReading(report: JournalReport): JournalReport {
  const { journal, snapshot } = report;
  return {
    journal: { ...journal, events: journal.events.map(withoutFields) },
    snapshot: {
      ...snapshot,
      journal: { ...snapshot.journal, tail: snapshot.journal.tail.map(withoutFields) },
      modules: withoutReadingState(snapshot.modules),
    },
  };
}

export function readingLeftOut(entry: DomainEvent): boolean {
  if (entry.type !== 'BookmarkAdded') {
    return false;
  }
  const { target, reference, article, story } = entry.payload;
  return (
    (target === 'passage' && reference === undefined) ||
    (target === 'article' && article === undefined) ||
    (target === 'story' && story === undefined)
  );
}
