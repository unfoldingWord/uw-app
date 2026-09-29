import type { OriginalWord, Token, Verse } from './types';

export type UsfmBook = {
  readonly code: string;
  readonly name: string;
  readonly names: readonly string[];
  readonly chapters: ReadonlyMap<number, readonly Verse[]>;
};

type Marker = { readonly name: string; readonly closing: boolean };

type Piece = { readonly marker?: Marker; readonly text: string };

type RawToken =
  | { readonly kind: 'word'; readonly text: string; readonly original: readonly OriginalWord[] }
  | { readonly kind: 'text'; readonly text: string };

const markerPattern = /\\(\+?[A-Za-z][A-Za-z0-9]*(?:-[se])?)(\*?)|\\\*/g;

const lineMarkers = new Set([
  'id',
  'usfm',
  'ide',
  'h',
  'toc1',
  'toc2',
  'toc3',
  'toca1',
  'toca2',
  'toca3',
  'mt',
  'mt1',
  'mt2',
  'mt3',
  'imt',
  'is',
  'ip',
  'ms',
  'ms1',
  'ms2',
  'mr',
  's',
  's1',
  's2',
  's3',
  's4',
  'sr',
  'r',
  'd',
  'rem',
  'sts',
  'cl',
  'cp',
  'cd',
]);

const nameMarkers = ['toc2', 'h', 'toc1', 'toc3'];

const characterMarkers = new Set([
  'add',
  'addpn',
  'bd',
  'bdit',
  'bk',
  'dc',
  'em',
  'it',
  'k',
  'nd',
  'no',
  'ord',
  'pn',
  'png',
  'qac',
  'qs',
  'qt',
  'rq',
  'sc',
  'sig',
  'sls',
  'sup',
  'tl',
  'wj',
]);

const skippedSpans: Readonly<Record<string, string>> = { f: 'f', fe: 'fe', x: 'x', ef: 'ef', ex: 'ex' };

const wordPattern = /[\p{L}\p{M}\p{N}]+(?:['’][\p{L}\p{M}\p{N}]+)*/gu;

const attributePattern = /([A-Za-z][A-Za-z0-9-]*)="([^"]*)"/g;

function split(text: string): Piece[] {
  const pieces: Piece[] = [];
  let last = 0;
  let pending: Marker | undefined;
  for (const match of text.matchAll(markerPattern)) {
    const before = text.slice(last, match.index);
    pieces.push(pending === undefined ? { text: before } : { marker: pending, text: before });
    pending =
      match[1] === undefined
        ? { name: '', closing: true }
        : { name: match[1].replace(/^\+/, ''), closing: match[2] === '*' };
    last = match.index + match[0].length;
  }
  const rest = text.slice(last);
  pieces.push(pending === undefined ? { text: rest } : { marker: pending, text: rest });
  return pieces;
}

function attributes(text: string): Readonly<Record<string, string>> {
  const found: Record<string, string> = {};
  for (const match of text.matchAll(attributePattern)) {
    if (match[1] !== undefined && match[2] !== undefined) {
      found[match[1]] = match[2];
    }
  }
  return found;
}

function whole(value: string | undefined): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
}

function originalWord(text: string): OriginalWord {
  const found = attributes(text.slice(text.indexOf('|') + 1));
  return {
    content: found['x-content'] ?? '',
    lemma: found['x-lemma'] ?? found.lemma ?? '',
    strong: found['x-strong'] ?? found.strong ?? '',
    occurrence: whole(found['x-occurrence']),
    occurrences: whole(found['x-occurrences']),
  };
}

function plainTokens(text: string): RawToken[] {
  const tokens: RawToken[] = [];
  let last = 0;
  for (const match of text.matchAll(wordPattern)) {
    if (match.index > last) {
      tokens.push({ kind: 'text', text: text.slice(last, match.index) });
    }
    tokens.push({ kind: 'word', text: match[0], original: [] });
    last = match.index + match[0].length;
  }
  if (last < text.length) {
    tokens.push({ kind: 'text', text: text.slice(last) });
  }
  return tokens;
}

function finishTokens(raw: readonly RawToken[]): { text: string; tokens: Token[] } {
  const merged: RawToken[] = [];
  for (const token of raw) {
    const previous = merged.at(-1);
    if (token.kind === 'text' && previous?.kind === 'text') {
      merged[merged.length - 1] = { kind: 'text', text: previous.text + token.text };
    } else {
      merged.push(token);
    }
  }
  const tokens: Token[] = [];
  let index = 0;
  merged.forEach((token, position) => {
    if (token.kind === 'word') {
      tokens.push({ kind: 'word', index, text: token.text, original: token.original });
      index += 1;
      return;
    }
    let text = token.text.replace(/\s+/g, ' ');
    if (position === 0) {
      text = text.trimStart();
    }
    if (position === merged.length - 1) {
      text = text.trimEnd();
    }
    if (text !== '') {
      tokens.push({ kind: 'text', text });
    }
  });
  return { text: tokens.map((token) => token.text).join(''), tokens };
}

type VerseStart = { chapter: number; verse: number; through?: number };

export function parseUsfm(source: string): UsfmBook {
  const headers = new Map<string, string>();
  const chapters = new Map<number, Verse[]>();
  const alignment: OriginalWord[] = [];
  let chapter = 0;
  let current: VerseStart | undefined;
  let raw: RawToken[] = [];
  let word: string | undefined;
  let skipping: string | undefined;

  const closeVerse = (): void => {
    if (current === undefined) {
      return;
    }
    const { text, tokens } = finishTokens(raw);
    const verses = chapters.get(current.chapter) ?? [];
    verses.push({ ...current, text, tokens });
    chapters.set(current.chapter, verses);
    current = undefined;
    raw = [];
  };

  const addText = (text: string): void => {
    if (current === undefined || text === '') {
      return;
    }
    if (word !== undefined) {
      word += text;
      return;
    }
    raw.push(...plainTokens(text));
  };

  for (const piece of split(source.replace(/\r\n?/g, '\n'))) {
    const marker = piece.marker;
    if (marker === undefined) {
      addText(piece.text);
      continue;
    }
    if (skipping !== undefined) {
      if (marker.closing && marker.name === skipping) {
        skipping = undefined;
        addText(piece.text);
      }
      continue;
    }
    const name = marker.name;
    if (lineMarkers.has(name) && !marker.closing) {
      const newline = piece.text.indexOf('\n');
      const value = (newline === -1 ? piece.text : piece.text.slice(0, newline)).trim();
      if (!headers.has(name)) {
        headers.set(name, value);
      }
      addText(newline === -1 ? '' : piece.text.slice(newline));
      continue;
    }
    if (name === 'c' && !marker.closing) {
      closeVerse();
      const match = /^\s*(\d+)/.exec(piece.text);
      chapter = whole(match?.[1]);
      continue;
    }
    if (name === 'v' && !marker.closing) {
      closeVerse();
      const match = /^\s*(\d+)(?:-(\d+))?[a-z]?\s?/.exec(piece.text);
      if (match === null || chapter === 0) {
        continue;
      }
      const verse = whole(match[1]);
      current = match[2] === undefined ? { chapter, verse } : { chapter, verse, through: whole(match[2]) };
      addText(piece.text.slice(match[0].length));
      continue;
    }
    if (skippedSpans[name] !== undefined && !marker.closing) {
      skipping = skippedSpans[name];
      continue;
    }
    if (name === 'zaln-s') {
      alignment.push(originalWord(piece.text));
      continue;
    }
    if (name === 'zaln-e') {
      alignment.pop();
      continue;
    }
    if (name === '' || name === 'k-s' || name === 'k-e' || name.startsWith('ts')) {
      addText(name === '' ? piece.text : '');
      continue;
    }
    if (name === 'w') {
      if (marker.closing) {
        const text = (word ?? '').split('|')[0]?.trim() ?? '';
        word = undefined;
        if (current !== undefined && text !== '') {
          raw.push({ kind: 'word', text, original: alignment.slice() });
        }
        addText(piece.text);
      } else {
        word = '';
        addText(piece.text);
      }
      continue;
    }
    if (marker.closing || characterMarkers.has(name)) {
      addText(marker.closing ? piece.text : piece.text.replace(/^ /, ''));
    } else {
      addText(` ${piece.text}`);
    }
  }
  closeVerse();

  const code = (headers.get('id') ?? '').split(/\s+/)[0]?.toUpperCase() ?? '';
  const names = [
    ...new Set(nameMarkers.flatMap((marker) => headers.get(marker) ?? []).filter((value) => value !== '')),
  ];
  return { code, name: names[0] ?? code, names, chapters };
}
