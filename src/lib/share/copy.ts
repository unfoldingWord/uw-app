import type { Passage, Verse } from '../corpus/types';
import type { CopyReference } from '../domain/preferences';
import { formatReference, type Reference } from '../domain/reference';
import type { Locale } from '../strings/locales';
import type { StringsApi } from '../strings/strings';
import { attributionOf } from './payload';

export type VersePoint = { readonly chapter: number; readonly verse: number };

export type VerseSpan = { readonly from: VersePoint; readonly to: VersePoint };

export type CopiedText = { readonly text: string; readonly reference: string; readonly label: string };

type Words = Pick<StringsApi, 't'>;

function compare(left: VersePoint, right: VersePoint): number {
  return left.chapter - right.chapter || left.verse - right.verse;
}

function endOf(verse: Verse): VersePoint {
  return { chapter: verse.chapter, verse: verse.through ?? verse.verse };
}

function ordered(span: VerseSpan): VerseSpan {
  return compare(span.from, span.to) <= 0 ? span : { from: span.to, to: span.from };
}

function versesIn(passage: Passage, span: VerseSpan): readonly Verse[] {
  const { from, to } = ordered(span);
  return passage.text.verses.filter((verse) => compare(verse, to) <= 0 && compare(endOf(verse), from) >= 0);
}

function numbered(verse: Verse): string {
  const number = verse.through === undefined ? `${verse.verse}` : `${verse.verse}-${verse.through}`;
  return `${number} ${verse.text}`;
}

function referenceOf(book: string, first: Verse, last: Verse): Reference {
  const start = { chapter: first.chapter, verse: first.verse };
  const end = endOf(last);
  return compare(start, end) === 0 ? { book, start } : { book, start, end };
}

function named(name: string, canonical: string, book: string): string {
  return `${name}${canonical.slice(book.length)}`;
}

export function copiedText(
  words: Words,
  locale: Locale,
  passage: Passage,
  span: VerseSpan,
  format: CopyReference,
): CopiedText | undefined {
  const verses = versesIn(passage, span);
  const [first] = verses;
  const last = verses.at(-1);
  if (first === undefined || last === undefined) {
    return undefined;
  }
  const { book, bookName, bookAbbreviation, provenance } = passage.text;
  const reference = formatReference(referenceOf(book, first, last));
  const body = verses.length === 1 ? first.text : verses.map(numbered).join(' ');
  const shown = named(format.endsWith('short') ? bookAbbreviation : bookName, reference, book);
  const lines = format === 'none' ? [body] : format.startsWith('before') ? [shown, body] : [body, shown];
  return {
    text: [...lines, attributionOf(words, locale, provenance)].join('\n'),
    reference,
    label: named(bookName, reference, book),
  };
}
