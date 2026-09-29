import { describe, expect, it } from 'vitest';
import { matchTerms, tokenizerFor } from './fulltext';
import { fold, referenceQuery } from './search';
import { isSafeIngredientKey } from './source';

describe('isSafeIngredientKey', () => {
  it('admits only listed keys under ingredients/ that stay inside the burrito', () => {
    expect(isSafeIngredientKey('ingredients/08-RUT.usfm')).toBe(true);
    expect(isSafeIngredientKey('ingredients/bible/kt/love.md')).toBe(true);
    expect(isSafeIngredientKey('ingredients/../metadata.json')).toBe(false);
    expect(isSafeIngredientKey('ingredients/./love.md')).toBe(false);
    expect(isSafeIngredientKey('/ingredients/love.md')).toBe(false);
    expect(isSafeIngredientKey('ingredients\\love.md')).toBe(false);
    expect(isSafeIngredientKey('README.md')).toBe(false);
    expect(isSafeIngredientKey('ingredients//love.md')).toBe(false);
  });
});

describe('search input', () => {
  it('folds case and marks for title search', () => {
    expect(fold('  Élie Ἀγάπη ')).toBe('elie αγαπη');
  });

  it('reads a reference only when the whole query is one', () => {
    expect(referenceQuery('Ruth 1:16')).toEqual({ book: 'RUT', start: { chapter: 1, verse: 16 } });
    expect(referenceQuery('Ruth')).toBeUndefined();
    expect(referenceQuery('love 3')).toBeUndefined();
  });

  it('quotes every word so that query syntax never reaches the index', () => {
    expect(matchTerms('famine OR "land')).toEqual(['famine', 'OR', 'land']);
    expect(matchTerms('  *  ')).toEqual([]);
  });

  it('indexes scripts written without spaces by trigrams', () => {
    expect(tokenizerFor('zh')).toBe('trigram');
    expect(tokenizerFor('zh-tw')).toBe('trigram');
    expect(tokenizerFor('en')).toBe('words');
    expect(tokenizerFor('qzz', ['神爱世人，甚至将他的独生子赐给他们'.repeat(20)])).toBe('trigram');
    expect(tokenizerFor('qzz', ['Dios amó tanto al mundo '.repeat(20)])).toBe('words');
  });
});
