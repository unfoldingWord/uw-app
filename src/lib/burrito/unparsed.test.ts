import { describe, expect, it } from 'vitest';
import { utf8 } from './files';
import { unparsedTsv, unparsedTsvMessage } from './unparsed';

describe('unparsedTsv', () => {
  it('names each TSV ingredient line that could not be read as a row', () => {
    const files = new Map([
      ['metadata.json', utf8('{}')],
      ['ingredients/tn_ACT.tsv', utf8('Reference\tID\tNote\n1:1\ta1\tA note that\nbreaks\n1:2\ta2\tFine.\n')],
      ['ingredients/tn_TIT.tsv', utf8('Reference\tID\tNote\n1:1\tt1\t"Quoted\nacross lines"\n')],
    ]);
    const found = unparsedTsv(files);
    expect(found).toEqual([
      { path: 'ingredients/tn_ACT.tsv', lines: [{ line: 3, columns: 1, expected: 3 }] },
    ]);
    expect(unparsedTsvMessage(found)).toBe(
      '1 TSV line could not be read as a row: ingredients/tn_ACT.tsv lines 3 (1 of 3 columns)',
    );
    expect(unparsedTsvMessage([])).toBeUndefined();
  });
});
