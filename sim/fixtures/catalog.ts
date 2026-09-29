import { md5Hex, utf8 } from '@lib/burrito/files';
import type { FixtureRelease } from './releases.ts';

const door43 = 'https://git.door43.org';
export const catalogSearchUrl = `${door43}/api/v1/catalog/search?stage=prod&topic=tc-ready`;
export const catalogLanguagesUrl = `${door43}/api/v1/catalog/list/languages?stage=prod&topic=tc-ready`;

export function burritoArchiveUrl(release: FixtureRelease): string {
  return `${door43}/${release.publisher}/${release.resource}/sb/${release.tag}.zip`;
}

export function burritoArchiveFile(release: FixtureRelease): string {
  return `sb/${release.publisher}/${release.resource}/${release.tag}.zip`;
}

export function commitOf(release: FixtureRelease): string {
  const key = `${release.publisher}/${release.resource}@${release.tag}`;
  return `${md5Hex(utf8(key))}${md5Hex(utf8(key.split('').reverse().join(''))).slice(0, 8)}`;
}

const contentFormats: Readonly<Record<string, string>> = {
  textTranslation: 'usfm',
  'x-bcvnotes': 'tsv',
  'x-bcvarticles': 'tsv',
  'x-bcvquestions': 'tsv',
  'x-peripheralArticles': 'markdown',
  textStories: 'markdown',
};

type CatalogIngredient = { identifier: string; title: string; path: string; sort: number };

function catalogIngredients(release: FixtureRelease): CatalogIngredient[] {
  if (release.books.length === 0) {
    return [{ identifier: release.abbreviation, title: release.title, path: './content', sort: 0 }];
  }
  return release.books.map((book, index) => ({
    identifier: book,
    title: book.toUpperCase(),
    path: `./${book.toUpperCase()}`,
    sort: index + 1,
  }));
}

function catalogEntry(release: FixtureRelease, index: number) {
  const fullName = `${release.publisher}/${release.resource}`;
  const id = index + 1;
  const tagUrl = `${door43}/${fullName}/archive/${release.tag}`;
  const language = {
    language: release.language.tag,
    language_title: release.language.title,
    language_direction: release.language.direction,
    language_is_gl: release.language.gatewayLanguage,
  };
  return {
    id,
    url: `${door43}/api/v1/catalog/entry/${fullName}/${release.tag}`,
    name: release.resource,
    owner: release.publisher,
    full_name: fullName,
    repo: {
      id: 1000 + id,
      owner: { login: release.publisher, full_name: release.publisher },
      name: release.resource,
      full_name: fullName,
      description: release.title,
      private: false,
      html_url: `${door43}/${fullName}`,
      clone_url: `${door43}/${fullName}.git`,
      default_branch: 'master',
      ...language,
      subject: release.subject,
      title: release.title,
      topics: ['tc-ready'],
    },
    release: {
      id: 2000 + id,
      tag_name: release.tag,
      target_commitish: 'master',
      name: release.tag,
      html_url: `${door43}/${fullName}/releases/tag/${release.tag}`,
      tarball_url: `${tagUrl}.tar.gz`,
      zipball_url: `${tagUrl}.zip`,
      draft: false,
      prerelease: false,
      created_at: release.released,
      published_at: release.released,
      assets: [],
    },
    tarball_url: `${tagUrl}.tar.gz`,
    zipball_url: `${tagUrl}.zip`,
    git_trees_url: `${door43}/api/v1/repos/${fullName}/git/trees/${release.tag}?recursive=1&per_page=99999`,
    contents_url: `${door43}/api/v1/repos/${fullName}/contents?ref=${release.tag}`,
    ...language,
    subject: release.subject,
    title: release.title,
    branch_or_tag_name: release.tag,
    ref_type: 'tag',
    commit_sha: commitOf(release),
    stage: 'prod',
    metadata_url: `${door43}/${fullName}/raw/tag/${release.tag}/manifest.yaml`,
    metadata_json_url: `${door43}/api/v1/catalog/entry/${fullName}/${release.tag}/metadata`,
    metadata_type: 'rc',
    metadata_version: '0.2',
    content_format: contentFormats[release.flavor] ?? 'unknown',
    released: release.released,
    ingredients: catalogIngredients(release),
    books: release.books,
    is_valid: true,
  };
}

export function catalogSearch(releases: readonly FixtureRelease[]) {
  return { ok: true, data: releases.map(catalogEntry) };
}

export function catalogLanguages(releases: readonly FixtureRelease[]) {
  return { ok: true, data: [...new Set(releases.map((release) => release.language.tag))].sort() };
}
