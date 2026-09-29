import { describe, expect, it } from 'vitest';
import { bookByCode, books, findBook } from './books';
import {
  compareReferences,
  formatReference,
  isCanonicalReference,
  parseReference,
  type Reference,
} from './reference';

function parsed(text: string): Reference {
  const result = parseReference(text);
  if (!result.ok) {
    throw new Error(`${text} did not parse: ${result.problem}`);
  }
  return result.reference;
}

describe('books', () => {
  it('holds the 66 books in canonical order with their testaments', () => {
    expect(books).toHaveLength(66);
    expect(books.filter((book) => book.testament === 'old')).toHaveLength(39);
    expect(books.filter((book) => book.testament === 'new')).toHaveLength(27);
    expect(books.map((book) => book.order)).toEqual(Array.from({ length: 66 }, (_, index) => index + 1));
    expect(new Set(books.map((book) => book.code)).size).toBe(66);
    expect(books[0]?.code).toBe('GEN');
    expect(books[39]?.code).toBe('MAT');
    expect(books[65]?.code).toBe('REV');
    expect(bookByCode('psa')?.chapters).toBe(150);
  });

  it('finds a book by code, name, alias or unique prefix', () => {
    expect(findBook('jhn')?.code).toBe('JHN');
    expect(findBook('John')?.code).toBe('JHN');
    expect(findBook('1 John')?.code).toBe('1JN');
    expect(findBook('1jn')?.code).toBe('1JN');
    expect(findBook('Song of Solomon')?.code).toBe('SNG');
    expect(findBook('Psalm')?.code).toBe('PSA');
    expect(findBook('Gen.')?.code).toBe('GEN');
    expect(findBook('Phil')).toBeUndefined();
    expect(findBook('Jo')).toBeUndefined();
    expect(findBook('Hezekiah')).toBeUndefined();
  });
});

describe('references', () => {
  it('parses a verse, a verse range, a chapter and ranges across chapters', () => {
    expect(parsed('JHN 3:16')).toEqual({ book: 'JHN', start: { chapter: 3, verse: 16 } });
    expect(parsed('John 3:16-18')).toEqual({
      book: 'JHN',
      start: { chapter: 3, verse: 16 },
      end: { chapter: 3, verse: 18 },
    });
    expect(parsed('jhn 3')).toEqual({ book: 'JHN', start: { chapter: 3 } });
    expect(parsed('JHN 3:16-4:2')).toEqual({
      book: 'JHN',
      start: { chapter: 3, verse: 16 },
      end: { chapter: 4, verse: 2 },
    });
    expect(parsed('Genesis 1-3')).toEqual({ book: 'GEN', start: { chapter: 1 }, end: { chapter: 3 } });
    expect(parsed('1 Samuel 17:4')).toEqual({ book: '1SA', start: { chapter: 17, verse: 4 } });
    expect(parsed('  Psalm 119:105 ')).toEqual({ book: 'PSA', start: { chapter: 119, verse: 105 } });
  });

  it('names what is wrong with a reference it refuses', () => {
    expect(parseReference('')).toEqual({ ok: false, problem: 'shape' });
    expect(parseReference('John')).toEqual({ ok: false, problem: 'shape' });
    expect(parseReference('Hezekiah 3:1')).toEqual({ ok: false, problem: 'book' });
    expect(parseReference('JHN 22:1')).toEqual({ ok: false, problem: 'chapter' });
    expect(parseReference('JHN 0')).toEqual({ ok: false, problem: 'chapter' });
    expect(parseReference('JHN 3:0')).toEqual({ ok: false, problem: 'verse' });
    expect(parseReference('JHN 3:18-16')).toEqual({ ok: false, problem: 'order' });
    expect(parseReference('JHN 3-4:2')).toEqual({ ok: false, problem: 'shape' });
  });

  it('formats canonically and round-trips', () => {
    for (const text of ['JHN 3:16', 'JHN 3:16-18', 'JHN 3', 'JHN 3:16-4:2', 'GEN 1-3', '1JN 4:8']) {
      expect(formatReference(parsed(text))).toBe(text);
      expect(isCanonicalReference(text)).toBe(true);
    }
    expect(formatReference(parsed('john 3:16 - 18'))).toBe('JHN 3:16-18');
    expect(isCanonicalReference('John 3:16')).toBe(false);
  });

  it('orders references by book, chapter and verse', () => {
    const texts = ['REV 1:1', 'JHN 3:16', 'GEN 1', 'JHN 3:2', 'MAL 4:6'];
    const ordered = texts.map(parsed).sort(compareReferences).map(formatReference);
    expect(ordered).toEqual(['GEN 1', 'MAL 4:6', 'JHN 3:2', 'JHN 3:16', 'REV 1:1']);
  });
});
