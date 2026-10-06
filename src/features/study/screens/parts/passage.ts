import { parseReference } from '@lib/domain/reference';
import type { Introduction, Note, Passage, Question, Verse, WordLink, WordSpan } from '../../service';

export type VerseKey = { readonly chapter: number; readonly verse: number };

export type VerseHelps = {
  readonly intros: readonly Introduction[];
  readonly notes: readonly Note[];
  readonly wordLinks: readonly WordLink[];
  readonly questions: readonly Question[];
  readonly footnotes: readonly string[];
};

function covers(reference: string, at: VerseKey): boolean {
  const parsed = parseReference(reference);
  if (!parsed.ok) {
    return false;
  }
  const { start, end } = parsed.reference;
  const from = start.chapter * 1000 + (start.verse ?? 0);
  const last = end ?? start;
  const through = last.chapter * 1000 + (last.verse ?? 999);
  const point = at.chapter * 1000 + at.verse;
  return point >= from && point <= through;
}

function spansTouch(spans: readonly WordSpan[], at: VerseKey): boolean {
  return spans.some((span) => span.chapter === at.chapter && span.verse === at.verse);
}

function inVerse(item: { reference: string; words?: readonly WordSpan[] }, at: VerseKey): boolean {
  return item.words !== undefined && item.words.length > 0
    ? spansTouch(item.words, at)
    : covers(item.reference, at);
}

function opensChapterAt(passage: Passage, at: VerseKey): boolean {
  const first = passage.text.verses.find((verse) => verse.chapter === at.chapter);
  return first !== undefined && first.verse === at.verse;
}

export function helpsAt(passage: Passage, at: VerseKey): VerseHelps {
  return {
    intros: opensChapterAt(passage, at)
      ? passage.intros.filter((intro) => (intro.chapter ?? 1) === at.chapter)
      : [],
    notes: passage.notes.filter((note) => inVerse(note, at)),
    wordLinks: passage.wordLinks.filter((link) => inVerse(link, at)),
    questions: passage.questions.filter((question) => covers(question.reference, at)),
    footnotes:
      passage.text.verses.find((verse) => verse.chapter === at.chapter && verse.verse === at.verse)
        ?.footnotes ?? [],
  };
}

export function keyOf(verse: Verse): VerseKey {
  return { chapter: verse.chapter, verse: verse.verse };
}

export function sameVerse(left: VerseKey | undefined, right: VerseKey): boolean {
  return left !== undefined && left.chapter === right.chapter && left.verse === right.verse;
}

export function highlightedIn(spans: readonly WordSpan[], at: VerseKey): ReadonlySet<number> {
  return new Set(
    spans
      .filter((span) => span.chapter === at.chapter && span.verse === at.verse)
      .flatMap((span) => span.tokens),
  );
}

export function chapterOf(reference: string): { book: string; chapter: number } | undefined {
  const parsed = parseReference(reference);
  return parsed.ok ? { book: parsed.reference.book, chapter: parsed.reference.start.chapter } : undefined;
}

export type ChapterPlace = { readonly book: string; readonly chapter: number };

export function neighbours(
  books: readonly { code: string; chapters: readonly number[] }[],
  at: ChapterPlace | undefined,
): { previous: ChapterPlace | undefined; next: ChapterPlace | undefined } {
  const places = books.flatMap((book) => book.chapters.map((chapter) => ({ book: book.code, chapter })));
  const index =
    at === undefined
      ? -1
      : places.findIndex((place) => place.book === at.book && place.chapter === at.chapter);
  return {
    previous: index > 0 ? places[index - 1] : undefined,
    next: index >= 0 && index < places.length - 1 ? places[index + 1] : undefined,
  };
}
