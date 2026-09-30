import { describe, expect, it } from 'vitest';
import { englishNameOf } from './languageNames';
import { languagesOf, searchLanguages } from './languages';
import { comparePublishers } from '../order';
import { normalizeEntry, normalizeLanguageNames, normalizePage } from './normalize';
import { rowOfSubject } from './subjects';
import type { CatalogRelease } from './types';

const entry = {
  name: 'es-419_tn',
  owner: 'es-419_gl',
  full_name: 'es-419_gl/es-419_tn',
  branch_or_tag_name: 'v12',
  commit_sha: 'b2a1c3d4e5f60718293a4b5c6d7e8f9012345678',
  stage: 'prod',
  subject: 'TSV Translation Notes',
  language: 'es-419',
  language_title: 'Español Latin America',
  language_direction: 'ltr',
  title: 'Notas de Traducción',
  released: '2026-06-01T00:00:00Z',
};

describe('catalog normalization (LA-1)', () => {
  it('turns a Door43 catalog entry into a release with its burrito archive and pack', () => {
    expect(normalizeEntry(entry)).toEqual({
      publisher: 'es-419_gl',
      resource: 'es-419_tn',
      language: 'es-419',
      tag: 'v12',
      commit: entry.commit_sha,
      title: 'Notas de Traducción',
      subject: 'TSV Translation Notes',
      archiveUrl: 'https://git.door43.org/es-419_gl/es-419_tn/sb/v12.zip',
      published: '2026-06-01T00:00:00Z',
      row: 'notes',
      kind: 'language',
      pack: 'language:es-419',
      bytes: undefined,
      autonym: 'Español Latin America',
      direction: 'ltr',
      assets: [],
      built: undefined,
    });
  });

  it('reads the repository fields when the entry leaves them out, and refuses what it cannot key', () => {
    const bare = Object.fromEntries(
      Object.entries(entry).filter(
        ([key]) => !['name', 'owner', 'language', 'subject', 'language_direction'].includes(key),
      ),
    );
    const nested = { ...bare, repo: { language: 'ar', subject: 'Aligned Bible', language_direction: 'rtl' } };
    expect(normalizeEntry(nested)).toMatchObject({
      publisher: 'es-419_gl',
      resource: 'es-419_tn',
      language: 'ar',
      row: 'text',
      direction: 'rtl',
    });
    expect(normalizeEntry({ ...entry, branch_or_tag_name: undefined })).toBeUndefined();
    expect(normalizeEntry({ ...entry, stage: 'preprod' })).toBeUndefined();
    expect(normalizeEntry({ ...entry, language: 'Spanish' })).toBeUndefined();
    expect(normalizeEntry('entry')).toBeUndefined();
    expect(normalizeEntry({ ...entry, subject: 'Something New' })).toMatchObject({
      row: undefined,
      kind: undefined,
      pack: undefined,
    });
  });

  it('keys releases whose names, tags and languages go past the narrow forms', () => {
    expect(
      normalizeEntry({
        ...entry,
        name: 'ne-x-kathmandu_OBS.v2',
        language: 'ne-x-kathmandu',
        branch_or_tag_name: 'v2.0.1-2026',
      }),
    ).toMatchObject({ resource: 'ne-x-kathmandu_OBS.v2', language: 'ne-x-kathmandu', tag: 'v2.0.1-2026' });
    expect(normalizeEntry({ ...entry, name: 'has space' })).toBeUndefined();
    expect(normalizeEntry({ ...entry, name: '../up' })).toBeUndefined();
  });

  it('accepts only the catalog search document shape, and counts the entries it drops', () => {
    expect(normalizePage({ ok: true, data: [entry, { name: 'x' }] })).toMatchObject({
      ok: true,
      entries: 2,
      dropped: 1,
    });
    expect(normalizePage({ ok: false, data: [] })).toEqual({ ok: false });
    expect(normalizePage({ data: {} })).toEqual({ ok: false });
    expect(normalizePage(undefined)).toEqual({ ok: false });
  });

  it('guesses the flavor row from the subject', () => {
    expect(rowOfSubject('TSV OBS Study Questions')).toBe('storyHelps');
    expect(rowOfSubject('Hebrew Old Testament')).toBe('text');
    expect(rowOfSubject('OBS Images')).toBe('images');
    expect(rowOfSubject('Bible Audio')).toBe('audio');
    expect(rowOfSubject('Translation Academy')).toBe('articles');
    expect(rowOfSubject('Unknown')).toBeUndefined();
  });

  it('lists unfoldingWord first, then publishers alphabetically', () => {
    expect(['Door43-Catalog', 'unfoldingWord', 'abc', 'BCS'].sort(comparePublishers)).toEqual([
      'unfoldingWord',
      'abc',
      'BCS',
      'Door43-Catalog',
    ]);
  });
});

describe('languages and search (LA-1)', () => {
  const release = (language: string, resource: string, autonym: string): CatalogRelease => ({
    ...(normalizeEntry({ ...entry, language, name: resource, language_title: autonym }) as CatalogRelease),
  });
  const languages = languagesOf(
    [
      release('fa', 'fa_ult', 'فارسی'),
      release('fa', 'fa_tn', 'فارسی'),
      release('pt-br', 'pt-br_obs', 'Português'),
      release('qaa', 'qaa_obs', 'Fixture A'),
    ],
    new Set(['fa']),
  );

  it('names each language by autonym and in English, counts its resources and marks it installed', () => {
    expect(
      languages.map((item) => [item.language, item.englishName, item.resources, item.installed]),
    ).toEqual([
      ['fa', 'Farsi', 2, true],
      ['qaa', 'Fixture A', 1, false],
      ['pt-br', 'Portuguese (Brazil)', 1, false],
    ]);
  });

  it('keeps English names in a table, since Hermes has no Intl.DisplayNames', () => {
    expect(englishNameOf('es-419', 'Español')).toBe('Spanish (Latin America)');
    expect(englishNameOf('sw-KE', 'Kiswahili')).toBe('Swahili');
    expect(englishNameOf('xyz', 'Xyzish')).toBe('Xyzish');
  });

  it.each([
    ['ne-x-kathmandu', 'Nepali'],
    ['kmr-x-kurmanji', 'Northern Kurdish'],
    ['ckb', 'Central Kurdish'],
    ['awa', 'Awadhi'],
    ['bho', 'Bhojpuri'],
    ['hne', 'Chhattisgarhi'],
    ['mai', 'Maithili'],
    ['ceb', 'Cebuano'],
    ['hil', 'Hiligaynon'],
    ['tpi', 'Tok Pisin'],
    ['swh', 'Swahili'],
    ['ti', 'Tigrinya'],
    ['om', 'Oromo'],
    ['kri', 'Krio'],
    ['apd', 'Sudanese Arabic'],
    ['prs', 'Dari'],
    ['pes', 'Iranian Persian'],
    ['cmn', 'Mandarin Chinese'],
    ['yue', 'Cantonese'],
    ['zh-tw', 'Chinese (Traditional)'],
    ['quy', 'Ayacucho Quechua'],
    ['arc', 'Aramaic'],
  ])('names %s in English as %s', (code, name) => {
    expect(englishNameOf(code, code)).toBe(name);
  });

  it('searches autonym, English name and code, ignoring case and accents', () => {
    const search = (query: string) => searchLanguages(languages, query).map((item) => item.language);
    expect(search('portugues')).toEqual(['pt-br']);
    expect(search('PORTUGUÊS')).toEqual(['pt-br']);
    expect(search('فار')).toEqual(['fa']);
    expect(search('pt')).toEqual(['pt-br']);
    expect(search('  ')).toEqual(['fa', 'qaa', 'pt-br']);
  });
});

describe('English names from the DCS languages list (LA-1, #14)', () => {
  const release = (language: string, resource: string, autonym: string): CatalogRelease => ({
    ...(normalizeEntry({ ...entry, language, name: resource, language_title: autonym }) as CatalogRelease),
  });

  it('reads ang, ln and ld per language and ignores entries it cannot key', () => {
    const names = normalizeLanguageNames({
      ok: true,
      data: [
        { lc: 'apd', ln: 'عربي سوداني', ang: 'Sudanese Arabic', ld: 'rtl', gw: false },
        { lc: 'ur-deva', ln: 'उर्दू', ang: 'Urdu (Devanagari)', ld: 'ltr', gw: false },
        { ln: 'no code' },
        'en',
      ],
    });
    expect(names).toEqual(
      new Map([
        ['apd', { englishName: 'Sudanese Arabic', autonym: 'عربي سوداني', direction: 'rtl' }],
        ['ur-deva', { englishName: 'Urdu (Devanagari)', autonym: 'उर्दू', direction: 'ltr' }],
      ]),
    );
    expect(normalizeLanguageNames({ ok: false })).toBeUndefined();
  });

  it('names and sorts right-to-left languages by their English name', () => {
    const names = new Map([
      ['aao', { englishName: 'Algerian Saharan Arabic', autonym: 'عربية', direction: 'rtl' as const }],
      ['qaa', { englishName: 'Fixture language A', autonym: 'Fixture A', direction: 'ltr' as const }],
    ]);
    const listed = languagesOf(
      [
        release('aao', 'aao_obs', 'عربية'),
        release('qaa', 'qaa_obs', 'Fixture A'),
        release('fa', 'fa_obs', 'فارسی'),
      ],
      new Set(),
      names,
    );
    expect(listed.map((item) => [item.language, item.englishName, item.direction])).toEqual([
      ['aao', 'Algerian Saharan Arabic', 'rtl'],
      ['fa', 'Farsi', 'ltr'],
      ['qaa', 'Fixture language A', 'ltr'],
    ]);
  });
});
