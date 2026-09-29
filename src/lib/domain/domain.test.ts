import { describe, expect, it } from 'vitest';
import { failureCodeOf, failureCodes, isFailureCode } from './failures';
import { isLanguageTag } from './language';
import { audioPackId, imagePackId, isPackId, languagePackId, originalPackId } from './pack';
import { isProvenance, sameRelease, type Provenance } from './provenance';
import { releaseKey } from './release';

const provenance: Provenance = {
  publisher: 'unfoldingWord',
  resource: 'ult',
  language: 'en',
  tag: 'v86',
  commit: '1a2b3c4',
  licence: 'CC BY-SA 4.0',
  title: 'unfoldingWord Literal Text',
};

describe('provenance', () => {
  it('requires every field, none empty', () => {
    expect(isProvenance(provenance)).toBe(true);
    expect(isProvenance({ ...provenance, licence: '' })).toBe(false);
    expect(
      isProvenance(Object.fromEntries(Object.entries(provenance).filter(([field]) => field !== 'commit'))),
    ).toBe(false);
    expect(isProvenance(null)).toBe(false);
  });

  it('knows two pieces of content come from the same release', () => {
    expect(sameRelease(provenance, { ...provenance, commit: 'other', title: 'other' })).toBe(true);
    expect(sameRelease(provenance, { ...provenance, tag: 'v87' })).toBe(false);
  });
});

describe('packs, releases and languages', () => {
  it('names each kind of pack in one shape', () => {
    expect(languagePackId('qaa')).toBe('language:qaa');
    expect(imagePackId).toBe('image:obs');
    expect(audioPackId('qaa', 'obs')).toBe('audio:qaa:obs');
    expect(originalPackId('hbo')).toBe('original:hbo');
    for (const id of [
      languagePackId('es-419'),
      imagePackId,
      audioPackId('qaa', 'obs'),
      originalPackId('hbo'),
    ]) {
      expect(isPackId(id)).toBe(true);
    }
    expect(isPackId('bundle:qaa')).toBe(false);
  });

  it('keys a release by publisher, language, resource and tag', () => {
    expect(releaseKey(provenance)).toBe('unfoldingWord/en_ult@v86');
  });

  it('accepts language tags and refuses free text', () => {
    expect(['en', 'qaa', 'es-419', 'el-x-koine', 'pt-BR'].every(isLanguageTag)).toBe(true);
    expect(['', 'English', 'en_US', 'e'].some(isLanguageTag)).toBe(false);
  });
});

describe('failure codes', () => {
  it('is a closed list, and anything else reads as unexpected', () => {
    expect(failureCodes).toContain('journal.persist-failed');
    expect(isFailureCode('http.offline')).toBe(true);
    expect(isFailureCode('disk on fire')).toBe(false);
    expect(failureCodeOf(Object.assign(new Error('x'), { code: 'files.no-space' }))).toBe('files.no-space');
    expect(failureCodeOf(new Error('ENOSPC'))).toBe('unexpected');
  });
});
