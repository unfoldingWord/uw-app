import { describe, expect, it } from 'vitest';
import { noteRows, parseHelpsReference, parseTsv, questionRows, wordLinkRows } from './tsv';

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
});
