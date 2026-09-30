import { describe, expect, it } from 'vitest';
import {
  helpsRowCount,
  noteRows,
  parseHelpsReference,
  parseTsv,
  questionRows,
  readTsv,
  wordLinkRows,
} from './tsv';

describe('parseHelpsReference', () => {
  it('reads verses, ranges, lists and ranges across chapters', () => {
    expect(parseHelpsReference('1:16')).toEqual({
      kind: 'verses',
      ranges: [{ start: { chapter: 1, verse: 16 }, end: { chapter: 1, verse: 16 } }],
    });
    expect(parseHelpsReference('1:3-5')).toEqual({
      kind: 'verses',
      ranges: [{ start: { chapter: 1, verse: 3 }, end: { chapter: 1, verse: 5 } }],
    });
    expect(parseHelpsReference('1:3,5')).toEqual({
      kind: 'verses',
      ranges: [
        { start: { chapter: 1, verse: 3 }, end: { chapter: 1, verse: 3 } },
        { start: { chapter: 1, verse: 5 }, end: { chapter: 1, verse: 5 } },
      ],
    });
    expect(parseHelpsReference('1:22-2:2')).toEqual({
      kind: 'verses',
      ranges: [{ start: { chapter: 1, verse: 22 }, end: { chapter: 2, verse: 2 } }],
    });
  });

  it('marks introductions and refuses what it cannot read', () => {
    expect(parseHelpsReference('front:intro')).toEqual({ kind: 'intro' });
    expect(parseHelpsReference('3:intro')).toEqual({ kind: 'intro' });
    expect(parseHelpsReference('chapter one')).toBeUndefined();
    expect(parseHelpsReference('')).toBeUndefined();
  });
});

describe('helps rows', () => {
  it('reads columns by name whatever their order, and unescapes new lines', () => {
    const rows = noteRows(
      'ID\tReference\tNote\tQuote\tOccurrence\tSupportReference\tTags\nab12\t2:1\tFirst line\\nSecond<br>Third\tλόγος\t2\trc://*/ta/man/translate/figs-idiom\t\n',
    );
    expect(rows).toEqual([
      {
        reference: {
          kind: 'verses',
          ranges: [{ start: { chapter: 2, verse: 1 }, end: { chapter: 2, verse: 1 } }],
        },
        id: 'ab12',
        support: 'rc://*/ta/man/translate/figs-idiom',
        quote: 'λόγος',
        occurrence: 2,
        note: 'First line\nSecond\nThird',
      },
    ]);
  });

  it('skips blank lines, rows with no id and rows with an unreadable reference', () => {
    const text =
      'Reference\tID\tQuestion\tResponse\n1:1\tq1\tWho?\tJohn.\n\n1:2\t\tNo id\t-\nsomewhere\tq3\tWhere?\tHere.\n';
    expect(questionRows(text).map((row) => row.id)).toEqual(['q1']);
    expect(parseTsv(text)).toHaveLength(3);
  });

  it('reads word links with their original words and article link, and missing cells as empty', () => {
    expect(
      wordLinkRows('Reference\tID\tOrigWords\tTWLink\n1:1\tw1\tἀγαπητῷ\trc://*/tw/dict/bible/kt/love\n'),
    ).toEqual([
      {
        reference: {
          kind: 'verses',
          ranges: [{ start: { chapter: 1, verse: 1 }, end: { chapter: 1, verse: 1 } }],
        },
        id: 'w1',
        original: 'ἀγαπητῷ',
        occurrence: 1,
        link: 'rc://*/tw/dict/bible/kt/love',
      },
    ]);
  });

  it('reads the nine-column notes of older releases by book, chapter and verse', () => {
    const nine =
      'Book\tChapter\tVerse\tID\tSupportReference\tOrigQuote\tOccurrence\tGLQuote\tOccurrenceNote\n' +
      'RUT\tfront\tintro\tx1\t\t\t0\t\t# Ruth\n' +
      'RUT\t1\tintro\tx2\t\t\t0\t\tChapter one\n' +
      'RUT\t1\t16\tab12\trc://*/ta/man/translate/figs-idiom\tאֱלֹהַ֖יִךְ\t1\tyour God\tNote text<br>more\n';
    expect(noteRows(nine)).toEqual([
      { reference: { kind: 'intro' }, id: 'x1', support: '', quote: '', occurrence: 0, note: '# Ruth' },
      { reference: { kind: 'intro' }, id: 'x2', support: '', quote: '', occurrence: 0, note: 'Chapter one' },
      {
        reference: {
          kind: 'verses',
          ranges: [{ start: { chapter: 1, verse: 16 }, end: { chapter: 1, verse: 16 } }],
        },
        id: 'ab12',
        support: 'rc://*/ta/man/translate/figs-idiom',
        quote: 'אֱלֹהַ֖יִךְ',
        occurrence: 1,
        note: 'Note text\nmore',
      },
    ]);
    expect(helpsRowCount(nine)).toBe(3);
  });

  it('counts only the rows it can read', () => {
    const text =
      'Reference\tID\tQuestion\tResponse\n1:1\tq1\tWho?\tJohn.\n1:2\t\tNo id\t-\nsomewhere\tq3\tWhere?\tHere.\n';
    expect(helpsRowCount(text)).toBe(1);
  });
});

describe('parseHelpsReference in the forms releases carry', () => {
  it('reads a part of a verse as the verse, and a chapter front as an introduction', () => {
    expect(parseHelpsReference('1:2a')).toEqual({
      kind: 'verses',
      ranges: [{ start: { chapter: 1, verse: 2 }, end: { chapter: 1, verse: 2 } }],
    });
    expect(parseHelpsReference('1:2b-4a')).toEqual({
      kind: 'verses',
      ranges: [{ start: { chapter: 1, verse: 2 }, end: { chapter: 1, verse: 4 } }],
    });
    expect(parseHelpsReference('2:front')).toEqual({ kind: 'intro' });
  });
});

describe('quoted cells', () => {
  const header = 'Reference\tID\tTags\tSupportReference\tQuote\tOccurrence\tNote';

  it('reads an RFC 4180 quoted cell that spans lines and doubles its quotes', () => {
    const text = `${header}\n1:1\tq1\t\t\tλόγος\t1\t"First line\nsecond line with ""a phrase"""\n1:2\tq2\t\t\tθεός\t1\tNext.\n1:3\tq3\t\t\tθεός\t1\t"He said ""peace"""\n`;
    expect(noteRows(text).map((row) => [row.id, row.note])).toEqual([
      ['q1', 'First line\nsecond line with "a phrase"'],
      ['q2', 'Next.'],
      ['q3', 'He said "peace"'],
    ]);
    expect(readTsv(text).unparsed).toEqual([]);
  });

  it('keeps a cell that only begins with a quotation as it is written', () => {
    const text = `${header}\n1:1\tq1\t\t\tλόγος\t1\t"Walk" is a metaphor for how a person lives.\n1:2\tq2\t\t\tθεός\t1\t"you live according to the truth"\n1:3\tq3\t\t\tθεός\t1\t"Unclosed\n`;
    expect(noteRows(text).map((row) => row.note)).toEqual([
      '"Walk" is a metaphor for how a person lives.',
      '"you live according to the truth"',
      '"Unclosed',
    ]);
    expect(readTsv(text).unparsed).toEqual([]);
  });

  it('reports the lines it could not read as a row', () => {
    const text = `${header}\n1:1\tq1\t\t\tλόγος\t1\t"A note that\nbreaks" without closing well\n1:2\tq2\t\t\tθεός\n`;
    expect(noteRows(text).map((row) => [row.id, row.note])).toEqual([
      ['q1', '"A note that'],
      ['q2', ''],
    ]);
    expect(readTsv(text).unparsed).toEqual([
      { line: 3, columns: 1, expected: 7 },
      { line: 4, columns: 5, expected: 7 },
    ]);
  });
});
