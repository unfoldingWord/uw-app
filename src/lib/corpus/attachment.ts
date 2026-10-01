import { attachQuote } from './alignment';
import type { Library } from './library';
import { bookNotesOnce, textBookOnce } from './loaders';
import { defaultText, readingTexts } from './passage';
import type { Entry } from './tables';
import type { HelpsReference, NoteRow } from './tsv';
import type { AttachmentCount, NotesAttachment, Verse } from './types';

type VerseReference = Extract<HelpsReference, { kind: 'verses' }>;

type QuotedRow = NoteRow & { readonly reference: VerseReference };

type Counted = AttachmentCount & { readonly text: string };

function chaptersOf(reference: VerseReference): Set<number> {
  const chapters = new Set<number>();
  for (const { start, end } of reference.ranges) {
    for (let chapter = start.chapter; chapter <= end.chapter; chapter += 1) {
      chapters.add(chapter);
    }
  }
  return chapters;
}

function isQuoted(row: NoteRow): row is QuotedRow {
  return row.reference.kind === 'verses' && row.occurrence !== 0 && row.quote.trim() !== '';
}

async function bookAttachment(library: Library, notes: Entry, book: string): Promise<Counted | undefined> {
  const text = defaultText(readingTexts(library, notes.language, book), 'literal');
  const parsed = text === undefined ? undefined : await textBookOnce(library, text, book);
  if (text === undefined || parsed === undefined) {
    return undefined;
  }
  let quoted = 0;
  let attached = 0;
  for (const row of await bookNotesOnce(library, notes, book)) {
    if (!isQuoted(row)) {
      continue;
    }
    quoted += 1;
    const verses: Verse[] = [...chaptersOf(row.reference)].flatMap(
      (chapter) => parsed.chapters.get(chapter) ?? [],
    );
    if (attachQuote(row.quote, row.occurrence, row.reference, verses).length > 0) {
      attached += 1;
    }
  }
  return { quoted, attached, text: text.provenance.resource };
}

export async function notesAttachment(
  library: Library,
  language: string,
  books?: readonly string[],
): Promise<NotesAttachment[]> {
  const found: NotesAttachment[] = [];
  for (const notes of library.of(language, ['notes'])) {
    const counts: Record<string, AttachmentCount> = {};
    let text: string | undefined;
    for (const book of notes.books.filter((code) => books === undefined || books.includes(code))) {
      const counted = await bookAttachment(library, notes, book);
      if (counted !== undefined) {
        counts[book] = { quoted: counted.quoted, attached: counted.attached };
        text ??= counted.text;
      }
    }
    const totals = Object.values(counts);
    const summary = {
      provenance: notes.provenance,
      quoted: totals.reduce((sum, count) => sum + count.quoted, 0),
      attached: totals.reduce((sum, count) => sum + count.attached, 0),
      books: counts,
    };
    found.push(text === undefined ? summary : { ...summary, text });
  }
  return found;
}
