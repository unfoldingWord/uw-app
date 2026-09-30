import { describe, expect, it } from 'vitest';
import { signOffFindings, signOffRows } from './locale-signoff.ts';

const table = (rows: string) => `# Strings

## Sign-off

| Locale | Reviewer | Date |
|---|---|---|
${rows}

## Next
`;

const empty = { fr: null, sw: null } as const;

describe('the locale sign-off table agrees with the code', () => {
  it('reads the rows of the sign-off table and nothing after it', () => {
    expect(signOffRows(table('| fr |  |  |\n| sw | Amina | 2026-10-02 |'))).toEqual([
      { locale: 'fr', reviewer: '', date: '' },
      { locale: 'sw', reviewer: 'Amina', date: '2026-10-02' },
    ]);
  });

  it('refuses a document with no sign-off table', () => {
    expect(signOffRows('# Strings\n\nNothing here.\n')).toBeUndefined();
  });

  it('passes when every drafted locale is listed once and none is signed off in either place', () => {
    expect(signOffFindings(signOffRows(table('| fr |  |  |\n| sw |  |  |')) ?? [], empty)).toEqual([]);
  });

  it('passes when a sign-off carries the same date in both places', () => {
    const rows = signOffRows(table('| fr |  |  |\n| sw | Amina | 2026-10-02 |')) ?? [];
    expect(signOffFindings(rows, { fr: null, sw: '2026-10-02' })).toEqual([]);
  });

  it('fails a sign-off in the document the code does not carry, and the reverse', () => {
    const signedInDoc = signOffRows(table('| fr |  |  |\n| sw | Amina | 2026-10-02 |')) ?? [];
    expect(signOffFindings(signedInDoc, empty)).toEqual([
      'sw: signed off in docs/strings-review.md on 2026-10-02 but localeSignOffs has null',
    ]);
    const unsignedInDoc = signOffRows(table('| fr |  |  |\n| sw |  |  |')) ?? [];
    expect(signOffFindings(unsignedInDoc, { fr: '2026-10-01', sw: null })).toEqual([
      'fr: localeSignOffs has 2026-10-01 but docs/strings-review.md has no sign-off',
    ]);
  });

  it('fails a date that differs, a half-filled row, a bad date, a missing or doubled or unknown locale', () => {
    const rows =
      signOffRows(table('| fr | Luc | 2026-10-03 |\n| fr |  |  |\n| xx |  |  |\n| sw | Amina |  |')) ?? [];
    expect(signOffFindings(rows, { fr: '2026-10-01', sw: null })).toEqual([
      'fr: listed 2 times in docs/strings-review.md',
      'xx: not a drafted locale',
      'sw: a sign-off needs both a reviewer and a date (YYYY-MM-DD)',
      'fr: signed off in docs/strings-review.md on 2026-10-03 but localeSignOffs has 2026-10-01',
    ]);
    expect(signOffFindings(signOffRows(table('| fr |  |  |')) ?? [], empty)).toEqual([
      'sw: missing from the sign-off table in docs/strings-review.md',
    ]);
    expect(
      signOffFindings(signOffRows(table('| fr | Luc | 3 October |\n| sw |  |  |')) ?? [], empty),
    ).toEqual(['fr: a sign-off needs both a reviewer and a date (YYYY-MM-DD)']);
  });
});
