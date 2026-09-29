import { bookByCode, findBook, type Book } from './books';

export type Point = { chapter: number; verse?: number };

export type Reference = { book: string; start: Point; end?: Point };

export type ReferenceProblem = 'shape' | 'book' | 'chapter' | 'verse' | 'order';

export type ParsedReference = { ok: true; reference: Reference } | { ok: false; problem: ReferenceProblem };

const shape = /^(.+?)\s*(\d{1,3})(?::(\d{1,3}))?(?:\s*[-–]\s*(\d{1,3})(?::(\d{1,3}))?)?$/;

function numberOrUndefined(text: string | undefined): number | undefined {
  return text === undefined ? undefined : Number(text);
}

function endPoint(start: Point, first: number | undefined, second: number | undefined): Point | undefined {
  if (first === undefined) {
    return undefined;
  }
  if (second !== undefined) {
    return { chapter: first, verse: second };
  }
  return start.verse === undefined ? { chapter: first } : { chapter: start.chapter, verse: first };
}

function comparePoints(left: Point, right: Point): number {
  return left.chapter - right.chapter || (left.verse ?? 0) - (right.verse ?? 0);
}

function problemWith(book: Book, start: Point, end: Point | undefined): ReferenceProblem | undefined {
  const points = end === undefined ? [start] : [start, end];
  if (points.some((point) => point.chapter < 1 || point.chapter > book.chapters)) {
    return 'chapter';
  }
  if (points.some((point) => point.verse !== undefined && point.verse < 1)) {
    return 'verse';
  }
  if (end !== undefined && (start.verse === undefined) !== (end.verse === undefined)) {
    return 'shape';
  }
  if (end !== undefined && comparePoints(start, end) >= 0) {
    return 'order';
  }
  return undefined;
}

export function parseReference(text: string): ParsedReference {
  const match = shape.exec(text.trim());
  if (match === null) {
    return { ok: false, problem: 'shape' };
  }
  const [, bookText = '', chapter = '', verse, endFirst, endSecond] = match;
  const book = findBook(bookText);
  if (book === undefined) {
    return { ok: false, problem: 'book' };
  }
  const start: Point =
    verse === undefined ? { chapter: Number(chapter) } : { chapter: Number(chapter), verse: Number(verse) };
  const end = endPoint(start, numberOrUndefined(endFirst), numberOrUndefined(endSecond));
  const problem = problemWith(book, start, end);
  if (problem !== undefined) {
    return { ok: false, problem };
  }
  return {
    ok: true,
    reference: end === undefined ? { book: book.code, start } : { book: book.code, start, end },
  };
}

function formatPoint(point: Point): string {
  return point.verse === undefined ? `${point.chapter}` : `${point.chapter}:${point.verse}`;
}

export function formatReference(reference: Reference): string {
  const start = `${reference.book} ${formatPoint(reference.start)}`;
  const { end } = reference;
  if (end === undefined) {
    return start;
  }
  if (end.verse !== undefined && end.chapter === reference.start.chapter) {
    return `${start}-${end.verse}`;
  }
  return `${start}-${formatPoint(end)}`;
}

export function isCanonicalReference(text: string): boolean {
  const parsed = parseReference(text);
  return parsed.ok && formatReference(parsed.reference) === text;
}

export function compareReferences(left: Reference, right: Reference): number {
  const leftOrder = bookByCode(left.book)?.order ?? 0;
  const rightOrder = bookByCode(right.book)?.order ?? 0;
  return leftOrder - rightOrder || comparePoints(left.start, right.start);
}
