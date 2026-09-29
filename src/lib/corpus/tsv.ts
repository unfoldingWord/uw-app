export type TsvRow = Readonly<Record<string, string>>;

export type HelpsPoint = { readonly chapter: number; readonly verse: number };

export type HelpsReference =
  | { readonly kind: 'intro' }
  | {
      readonly kind: 'verses';
      readonly ranges: readonly { readonly start: HelpsPoint; readonly end: HelpsPoint }[];
    };

export type NoteRow = {
  readonly reference: HelpsReference;
  readonly id: string;
  readonly support: string;
  readonly quote: string;
  readonly occurrence: number;
  readonly note: string;
};

export type WordLinkRow = {
  readonly reference: HelpsReference;
  readonly id: string;
  readonly original: string;
  readonly occurrence: number;
  readonly link: string;
};

export type QuestionRow = {
  readonly reference: HelpsReference;
  readonly id: string;
  readonly quote: string;
  readonly occurrence: number;
  readonly question: string;
  readonly response: string;
};

export function unescapeCell(text: string): string {
  return text
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/\\n/g, '\n')
    .trim();
}

export function parseTsv(text: string): TsvRow[] {
  const lines = text.replace(/\r\n?/g, '\n').split('\n');
  const header = (lines[0] ?? '')
    .replace(/^\uFEFF/, '')
    .split('\t')
    .map((cell) => cell.trim());
  return lines.slice(1).flatMap((line) => {
    if (line.trim() === '') {
      return [];
    }
    const cells = line.split('\t');
    return [Object.fromEntries(header.map((name, index) => [name, cells[index] ?? '']))];
  });
}

const pointPattern = /^(\d+):(\d+)[a-z]?$/;
const versePattern = /^(\d+)[a-z]?$/;
const introPattern = /^(front|\d+):(intro|front)$|^front$|^intro$/;

function point(text: string, chapter: number | undefined): HelpsPoint | undefined {
  const full = pointPattern.exec(text);
  if (full) {
    return { chapter: Number(full[1]), verse: Number(full[2]) };
  }
  const verse = versePattern.exec(text);
  if (chapter !== undefined && verse) {
    return { chapter, verse: Number(verse[1]) };
  }
  return undefined;
}

export function parseHelpsReference(text: string): HelpsReference | undefined {
  const trimmed = text.trim();
  if (introPattern.test(trimmed)) {
    return { kind: 'intro' };
  }
  const ranges: { start: HelpsPoint; end: HelpsPoint }[] = [];
  let chapter: number | undefined;
  for (const part of trimmed.split(/[;,]\s*/)) {
    const [from = '', to] = part.split(/[-–]/);
    const start = point(from.trim(), chapter);
    if (start === undefined) {
      return undefined;
    }
    chapter = start.chapter;
    const end = to === undefined ? start : point(to.trim(), chapter);
    if (end === undefined) {
      return undefined;
    }
    chapter = end.chapter;
    ranges.push({ start, end });
  }
  return ranges.length === 0 ? undefined : { kind: 'verses', ranges };
}

function occurrenceOf(text: string | undefined): number {
  const trimmed = (text ?? '').trim();
  const parsed = Number(trimmed);
  return trimmed !== '' && Number.isInteger(parsed) ? parsed : 1;
}

const legacyColumns: Readonly<Record<string, string>> = {
  OrigQuote: 'Quote',
  OccurrenceNote: 'Note',
};

function referenceText(row: TsvRow): string {
  if (row.Reference !== undefined) {
    return row.Reference;
  }
  const chapter = (row.Chapter ?? '').trim();
  const verse = (row.Verse ?? '').trim();
  return chapter === '' || verse === '' ? '' : `${chapter}:${verse}`;
}

function current(row: TsvRow): TsvRow {
  if (row.Reference !== undefined) {
    return row;
  }
  const renamed: Record<string, string> = { ...row };
  for (const [legacy, name] of Object.entries(legacyColumns)) {
    const value = row[legacy];
    if (value !== undefined && renamed[name] === undefined) {
      renamed[name] = value;
    }
  }
  return renamed;
}

type ReadRow = { readonly row: TsvRow; readonly reference: HelpsReference };

function readRows(text: string): ReadRow[] {
  return parseTsv(text).flatMap((row) => {
    const reference = parseHelpsReference(referenceText(row));
    return reference === undefined || (row.ID ?? '').trim() === '' ? [] : [{ row: current(row), reference }];
  });
}

function rowsWith<T>(text: string, build: (row: TsvRow, reference: HelpsReference) => T): T[] {
  return readRows(text).map(({ row, reference }) => build(row, reference));
}

export function noteRows(text: string): NoteRow[] {
  return rowsWith(text, (row, reference) => ({
    reference,
    id: row.ID ?? '',
    support: (row.SupportReference ?? '').trim(),
    quote: unescapeCell(row.Quote ?? ''),
    occurrence: occurrenceOf(row.Occurrence),
    note: unescapeCell(row.Note ?? ''),
  }));
}

export function wordLinkRows(text: string): WordLinkRow[] {
  return rowsWith(text, (row, reference) => ({
    reference,
    id: row.ID ?? '',
    original: unescapeCell(row.OrigWords ?? ''),
    occurrence: occurrenceOf(row.Occurrence),
    link: (row.TWLink ?? '').trim(),
  }));
}

export function questionRows(text: string): QuestionRow[] {
  return rowsWith(text, (row, reference) => ({
    reference,
    id: row.ID ?? '',
    quote: unescapeCell(row.Quote ?? ''),
    occurrence: occurrenceOf(row.Occurrence),
    question: unescapeCell(row.Question ?? ''),
    response: unescapeCell(row.Response ?? ''),
  }));
}

export function helpsRowCount(text: string): number {
  return readRows(text).length;
}
