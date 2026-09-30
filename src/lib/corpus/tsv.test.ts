import { describe, expect, it } from 'vitest';
import { helpsRowCount, noteRows, parseHelpsReference, parseTsv, questionRows, wordLinkRows } from './tsv';

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
