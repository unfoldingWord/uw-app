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

export function helpKey(help: {
  readonly id: string;
  readonly provenance: { readonly resource: string };
}): string {
  return `${help.provenance.resource}/${help.id}`;
}

export function focusedSpans(helps: VerseHelps, focused: string | undefined): readonly WordSpan[] {
  if (focused === undefined) {
    return [];
  }
  const help = [...helps.notes, ...helps.wordLinks].find((item) => helpKey(item) === focused);
  return help?.words ?? [];
}

export type Placement = 'placed' | 'not-found' | 'unquoted';

export function placementOf(note: Note, at: VerseKey): Placement {
  if (note.quote.trim().length === 0) {
    return 'unquoted';
  }
  return spansTouch(note.words, at) ? 'placed' : 'not-found';
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

export function requestedVerse(reference: string | undefined): VerseKey | undefined {
  if (reference === undefined) {
    return undefined;
  }
  const parsed = parseReference(reference);
  if (!parsed.ok) {
    return undefined;
  }
  const { chapter, verse } = parsed.reference.start;
  return verse === undefined ? undefined : { chapter, verse };
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

export type ListPlace = {
  readonly chapter: string;
  readonly reading: string;
  readonly landing: VerseKey | undefined;
  readonly selected: VerseKey | undefined;
};

export type ScrollMove = { readonly verse: VerseKey; readonly position: 'near-top' | 'centre' };

export type ScrollPlan =
  | { readonly kind: 'top' }
  | { readonly kind: 'end' }
  | { readonly kind: 'index'; readonly index: number; readonly viewPosition: number };

const viewPositions = { 'near-top': 0.2, centre: 0.5 } as const;

export function scrollMove(
  before: ListPlace | undefined,
  now: ListPlace,
  inView: VerseKey | undefined,
): ScrollMove | undefined {
  if (before === undefined || before.chapter !== now.chapter) {
    const verse = now.selected ?? now.landing;
    return verse === undefined ? undefined : { verse, position: 'near-top' };
  }
  if (before.reading !== now.reading) {
    const verse = before.selected ?? now.selected ?? inView;
    return verse === undefined ? undefined : { verse, position: 'centre' };
  }
  if (now.selected !== undefined && !sameVerse(before.selected, now.selected)) {
    return { verse: now.selected, position: 'near-top' };
  }
  return undefined;
}

function pointOf(chapter: number, verse: number): number {
  return chapter * 1000 + verse;
}

export function indexNear(verses: readonly Verse[], wanted: VerseKey): number {
  const covering = verses.findIndex(
    (verse) =>
      verse.chapter === wanted.chapter &&
      verse.verse <= wanted.verse &&
      wanted.verse <= (verse.through ?? verse.verse),
  );
  if (covering >= 0) {
    return covering;
  }
  const target = pointOf(wanted.chapter, wanted.verse);
  return verses.reduce(
    (best, verse, index) => {
      const distance = Math.abs(pointOf(verse.chapter, verse.verse) - target);
      return best.index < 0 || distance < best.distance ? { index, distance } : best;
    },
    { index: -1, distance: 0 },
  ).index;
}

export function scrollPlan(move: ScrollMove, verses: readonly Verse[]): ScrollPlan | undefined {
  const index = indexNear(verses, move.verse);
  if (index < 0) {
    return undefined;
  }
  if (index === 0) {
    return { kind: 'top' };
  }
  if (move.position === 'centre' && index === verses.length - 1) {
    return { kind: 'end' };
  }
  return { kind: 'index', index, viewPosition: viewPositions[move.position] };
}

export function middleOf(keys: readonly VerseKey[]): VerseKey | undefined {
  return keys[Math.floor(keys.length / 2)];
}

function compareKeys(left: VerseKey, right: VerseKey): number {
  return left.chapter - right.chapter || left.verse - right.verse;
}

export function orderedSpan(from: VerseKey, to: VerseKey | undefined): { from: VerseKey; to: VerseKey } {
  const end = to ?? from;
  return compareKeys(from, end) <= 0 ? { from, to: end } : { from: end, to: from };
}

export function inSpan(verse: Verse, from: VerseKey, to: VerseKey | undefined): boolean {
  const { from: low, to: high } = orderedSpan(from, to);
  const last = { chapter: verse.chapter, verse: verse.through ?? verse.verse };
  return compareKeys(verse, high) <= 0 && compareKeys(last, low) >= 0;
}
