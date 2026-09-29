import { describe, expect, it } from 'vitest';
import { failureCodeOf, failureCodes, isFailureCode } from './failures';
import { isLanguageTag } from './language';
import { admittedRows } from '../burrito/flavors';
import {
  audioPackId,
  imagePackId,
  isPackId,
  languagePackId,
  originalPackId,
  packDirectory,
  packIdOf,
  packKindOf,
  resourceRows,
} from './pack';
import { isProvenance, sameRelease, sourceUrlOf, unrecordedCommit, type Provenance } from './provenance';
import { archiveUrlOf, releaseKey, resourceKey } from './release';

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

  it('is one shape for the burrito reader and Packs, with an optional release time and a source link', () => {
    expect(isProvenance({ ...provenance, commit: unrecordedCommit, released: '2026-09-01T00:00:00Z' })).toBe(
      true,
    );
    expect(isProvenance({ ...provenance, released: 5 })).toBe(false);
    expect(sourceUrlOf(provenance)).toBe('https://git.door43.org/unfoldingWord/ult/releases/tag/v86');
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

  it('keys a release by publisher, resource and tag, and derives its burrito archive', () => {
    const release = { publisher: 'unfoldingWord', resource: 'en_ult', language: 'en', tag: 'v86' };
    expect(releaseKey(release)).toBe('unfoldingWord/en_ult@v86');
    expect(resourceKey(release)).toBe('unfoldingWord/en_ult');
    expect(archiveUrlOf(release)).toBe('https://git.door43.org/unfoldingWord/en_ult/sb/v86.zip');
  });

  it('puts every row in one kind of pack, and gives each pack one directory', () => {
    expect(packKindOf('text', 'qaa')).toBe('language');
    expect(packKindOf('text', 'hbo')).toBe('original');
    expect(packKindOf('stories', 'qaa')).toBe('language');
    expect(packKindOf('images', 'zxx')).toBe('image');
    expect(packKindOf('audio', 'qaa')).toBe('audio');
    expect(packIdOf('language', 'qaa', 'qaa_ult')).toBe('language:qaa');
    expect(packIdOf('audio', 'qaa', 'qaa_ult-audio')).toBe('audio:qaa:qaa_ult-audio');
    expect(packIdOf('original', 'hbo', 'hbo_uhb')).toBe('original:hbo');
    expect(packIdOf('image', 'zxx', 'obs-images')).toBe(imagePackId);
    expect(packDirectory('language:qaa')).toBe('packs/language/qaa');
    expect(packDirectory('audio:qaa:qaa_ult-audio')).toBe('packs/audio/qaa/qaa_ult-audio');
  });

  it('names the same rows as the burrito contract', () => {
    expect([...resourceRows].sort()).toEqual(admittedRows.map((row) => row.id).sort());
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
