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

const pointPattern = /^(\d+):(\d+)$/;

function point(text: string, chapter: number | undefined): HelpsPoint | undefined {
  const full = pointPattern.exec(text);
  if (full) {
    return { chapter: Number(full[1]), verse: Number(full[2]) };
  }
  if (chapter !== undefined && /^\d+$/.test(text)) {
    return { chapter, verse: Number(text) };
  }
  return undefined;
}

export function parseHelpsReference(text: string): HelpsReference | undefined {
  const trimmed = text.trim();
  if (/(^|:)intro$/.test(trimmed) || trimmed.startsWith('front')) {
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
  const parsed = Number(text);
  return Number.isInteger(parsed) ? parsed : 1;
}

function rowsWith<T>(text: string, build: (row: TsvRow, reference: HelpsReference) => T): T[] {
  return parseTsv(text).flatMap((row) => {
    const reference = parseHelpsReference(row.Reference ?? '');
    return reference === undefined || (row.ID ?? '') === '' ? [] : [build(row, reference)];
  });
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
  return parseTsv(text).filter((row) => (row.ID ?? '') !== '').length;
}
