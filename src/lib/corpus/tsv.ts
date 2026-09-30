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

function unescapeCell(text: string): string {
  return text
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/\\n/g, '\n')
    .trim();
}

export type UnparsedTsvLine = { readonly line: number; readonly columns: number; readonly expected: number };

export type TsvRead = { readonly rows: readonly TsvRow[]; readonly unparsed: readonly UnparsedTsvLine[] };

type QuotedRecord = { readonly cells: readonly string[]; readonly end: number; readonly escaped: boolean };

const quote = '"';

function quotedCell(
  text: string,
  from: number,
): { value: string; end: number; escaped: boolean } | undefined {
  let value = '';
  let at = from + 1;
  let escaped = false;
  for (;;) {
    const close = text.indexOf(quote, at);
    if (close === -1) {
      return undefined;
    }
    value += text.slice(at, close);
    if (text[close + 1] === quote) {
      value += quote;
      escaped = true;
      at = close + 2;
      continue;
    }
    const after = text[close + 1];
    return after === undefined || after === '\t' || after === '\n'
      ? { value, end: close + 1, escaped }
      : undefined;
  }
}

function quotedRecord(text: string, from: number, expected: number): QuotedRecord | undefined {
  const cells: string[] = [];
  let at = from;
  let escaped = false;
  for (;;) {
    if (text[at] === quote) {
      const cell = quotedCell(text, at);
      if (cell === undefined) {
        return undefined;
      }
      cells.push(cell.value);
      escaped ||= cell.escaped;
      at = cell.end;
    } else {
      const tab = text.indexOf('\t', at);
      const newline = text.indexOf('\n', at);
      const stops = [tab, newline, text.length].filter((stop) => stop !== -1);
      const end = Math.min(...stops);
      cells.push(text.slice(at, end));
      at = end;
    }
    if (cells.length > expected) {
      return undefined;
    }
    if (text[at] === '\t') {
      at += 1;
      continue;
    }
    return cells.length === expected ? { cells, end: at, escaped } : undefined;
  }
}

function linesIn(text: string, from: number, to: number): number {
  let count = 0;
  for (let at = text.indexOf('\n', from); at !== -1 && at < to; at = text.indexOf('\n', at + 1)) {
    count += 1;
  }
  return count;
}

export function readTsv(text: string): TsvRead {
  const normal = text.replace(/\r\n?/g, '\n');
  const headerEnd = normal.indexOf('\n');
  const header = normal
    .slice(0, headerEnd === -1 ? normal.length : headerEnd)
    .replace(/^\uFEFF/, '')
    .split('\t')
    .map((cell) => cell.trim());
  const expected = header.length;
  const rows: TsvRow[] = [];
  const unparsed: UnparsedTsvLine[] = [];
  const rowOf = (cells: readonly string[]): TsvRow =>
    Object.fromEntries(header.map((name, index) => [name, cells[index] ?? '']));
  let at = headerEnd === -1 ? normal.length : headerEnd + 1;
  let line = 2;
  while (at < normal.length) {
    const found = normal.indexOf('\n', at);
    const end = found === -1 ? normal.length : found;
    const literal = normal.slice(at, end);
    if (literal.trim() === '') {
      at = end + 1;
      line += 1;
      continue;
    }
    const cells = literal.split('\t');
    const quoted = cells.some((cell) => cell.startsWith(quote))
      ? quotedRecord(normal, at, expected)
      : undefined;
    if (quoted !== undefined && (quoted.end > end || quoted.escaped || cells.length !== expected)) {
      rows.push(rowOf(quoted.cells));
      line += linesIn(normal, at, quoted.end) + 1;
      at = quoted.end + 1;
      continue;
    }
    if (cells.length !== expected) {
      unparsed.push({ line, columns: cells.length, expected });
    }
    rows.push(rowOf(cells));
    at = end + 1;
    line += 1;
  }
  return { rows, unparsed };
}

export function parseTsv(text: string): TsvRow[] {
  return [...readTsv(text).rows];
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
