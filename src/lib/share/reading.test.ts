import { describe, expect, it } from 'vitest';
import type { DeviceSnapshot } from '../compose';
import type { JournalEntry } from '../journal/entry';
import type { JournalReport } from './payload';
import { leaveOutReading, readingLeftOut } from './reading';

const events: JournalEntry[] = [
  { seq: 1, at: 1, type: 'AppOpened', payload: { day: '2026-09-30' } },
  { seq: 2, at: 2, type: 'PassageOpened', payload: { reference: 'RUT 1:16', language: 'qaa' } },
  { seq: 3, at: 3, type: 'ArticleOpened', payload: { article: 'tw/bible/kt/love', language: 'qaa' } },
  { seq: 4, at: 4, type: 'StoryOpened', payload: { story: 3, language: 'qaa' } },
  {
    seq: 5,
    at: 5,
    type: 'BookmarkAdded',
    payload: { bookmark: 'id-000001', target: 'passage', reference: 'RUT 1:16', language: 'qaa' },
  },
  { seq: 6, at: 6, type: 'GroupCreated', payload: { group: 'id-000002' } },
];

const snapshot: DeviceSnapshot = {
  version: 1,
  journal: { limit: 10, size: 6, dropped: 0, lastSeq: 6, unpersisted: 0, tail: events },
  modules: {
    bookmarks: { bookmarks: [{ target: 'passage', reference: 'RUT 1:16', language: 'qaa' }] },
    preferences: { values: { 'home.theme': 'dark' }, lastPassage: { qaa: 'RUT 1:16' } },
    formation: { groups: 1 },
  },
};

const report: JournalReport = {
  journal: { format: 'unfoldingword-journal', version: 2, limit: 10, dropped: 0, baseline: {}, events },
  snapshot,
};

describe('leaving out what a leader read', () => {
  const left = leaveOutReading(report);

  it('keeps every event and drops only the reference, article and story it named', () => {
    expect(left.journal.events.map((event) => event.type)).toEqual(events.map((event) => event.type));
    expect(left.journal.events.map((event) => event.payload)).toEqual([
      { day: '2026-09-30' },
      { language: 'qaa' },
      { language: 'qaa' },
      { language: 'qaa' },
      { bookmark: 'id-000001', target: 'passage', language: 'qaa' },
      { group: 'id-000002' },
    ]);
    expect(left.snapshot.journal.tail).toEqual(left.journal.events);
  });

  it('counts the bookmarks and drops the last passage per language from the snapshot', () => {
    expect(left.snapshot.modules).toEqual({
      bookmarks: { count: 1 },
      preferences: { values: { 'home.theme': 'dark' } },
      formation: { groups: 1 },
    });
    expect(JSON.stringify(left)).not.toMatch(/RUT|love|"story":3/);
  });

  it('leaves the report it was handed untouched', () => {
    expect(report.snapshot.modules.bookmarks).toEqual(snapshot.modules.bookmarks);
    expect(report.journal.events[1]?.payload).toEqual({ reference: 'RUT 1:16', language: 'qaa' });
  });

  it('names a bookmark whose target was left out, which replay cannot redo', () => {
    expect(left.journal.events.map(readingLeftOut)).toEqual([false, false, false, false, true, false]);
    expect(events.map(readingLeftOut).some(Boolean)).toBe(false);
  });
});
