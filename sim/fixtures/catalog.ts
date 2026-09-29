import { md5Hex, utf8 } from '@lib/burrito/files';
import type { FixtureRelease } from './releases.ts';

const door43 = 'https://git.door43.org';
export const catalogSearchBase = `${door43}/api/v1/catalog/search`;
export const catalogSearchUrl = `${catalogSearchBase}?stage=prod&topic=tc-ready`;
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
  'x-obsnotes': 'tsv',
  'x-obsquestions': 'tsv',
  'x-peripheralArticles': 'markdown',
  textStories: 'markdown',
};

type CatalogIngredient = {
  categories: null;
  identifier: string;
  path: string;
  sort: number;
  title: string;
  versification: string;
  exists: boolean;
  is_dir: boolean;
  size: number;
};

function catalogIngredients(release: FixtureRelease): CatalogIngredient[] {
  const ingredient = (
    identifier: string,
    title: string,
    path: string,
    sort: number,
    isDirectory: boolean,
  ) => ({
    categories: null,
    identifier,
    path,
    sort,
    title,
    versification: 'ufw',
    exists: true,
    is_dir: isDirectory,
    size: 0,
  });
  if (release.books.length === 0) {
    return [ingredient(release.abbreviation.toLowerCase(), release.title, './content', 0, true)];
  }
  return release.books.map((book, index) =>
    ingredient(
      book,
      book.toUpperCase(),
      `./${book.toUpperCase()}.${contentFormats[release.flavor] ?? 'md'}`,
      index + 1,
      false,
    ),
  );
}

function stageOf(release: FixtureRelease, fullName: string, reference: string, commit: string) {
  return {
    branch_or_tag_name: reference,
    release_url: reference === 'master' ? null : `${door43}/api/v1/repos/${fullName}/releases/${reference}`,
    commit_sha: commit,
    released: release.released,
    zipball_url: `${door43}/${fullName}/archive/${reference}.zip`,
    tarball_url: `${door43}/${fullName}/archive/${reference}.tar.gz`,
    git_trees_url: `${door43}/api/v1/repos/${fullName}/git/trees/${reference}?recursive=1&per_page=99999`,
    contents_url: `${door43}/api/v1/repos/${fullName}/contents?ref=${reference}`,
  };
}

function catalogEntry(release: FixtureRelease, index: number) {
  const fullName = `${release.publisher}/${release.resource}`;
  const id = index + 1;
  const tagUrl = `${door43}/${fullName}/archive/${release.tag}`;
  const commit = commitOf(release);
  const flavor = release.catalogFlavor ?? { flavorType: release.flavorType, flavor: release.flavor };
  const described = {
    language: release.language.tag,
    language_title: release.language.title,
    language_direction: release.language.direction,
    language_is_gl: release.language.gatewayLanguage,
    subject: release.subject,
    flavor_type: flavor.flavorType,
    flavor: flavor.flavor,
    abbreviation: release.abbreviation.toLowerCase(),
    title: release.title,
  };
  const ingredients = catalogIngredients(release);
  return {
    id,
    url: `${door43}/api/v1/catalog/entry/${fullName}/${release.tag}`,
    name: release.resource,
    owner: release.publisher,
    full_name: fullName,
    repo: {
      id: 1000 + id,
      owner: { id: 3000 + id, login: release.publisher, full_name: release.publisher },
      name: release.resource,
      full_name: fullName,
      description: release.title,
      empty: false,
      private: false,
      html_url: `${door43}/${fullName}`,
      clone_url: `${door43}/${fullName}.git`,
      default_branch: 'master',
      topics: null,
      metadata_type: 'rc',
      metadata_version: '0.2',
      ...described,
      ingredients,
      relations: null,
      catalog: {
        prod: stageOf(release, fullName, release.tag, commit),
        preprod: null,
        latest: stageOf(release, fullName, 'master', commit),
      },
      content_format: contentFormats[release.flavor] ?? 'unknown',
    },
    release: {
      id: 2000 + id,
      tag_name: release.tag,
      target_commitish: 'master',
      name: release.tag,
      body: '',
      url: `${door43}/api/v1/repos/${fullName}/releases/${2000 + id}`,
      html_url: `${door43}/${fullName}/releases/tag/${release.tag}`,
      tarball_url: `${tagUrl}.tar.gz`,
      zipball_url: `${tagUrl}.zip`,
      draft: false,
      prerelease: false,
      created_at: release.released,
      published_at: release.released,
      assets: [],
    },
    tarbar_url: `${tagUrl}.tar.gz`,
    zipball_url: `${tagUrl}.zip`,
    git_trees_url: `${door43}/api/v1/repos/${fullName}/git/trees/${release.tag}?recursive=1&per_page=99999`,
    contents_url: `${door43}/api/v1/repos/${fullName}/contents?ref=${release.tag}`,
    ...described,
    branch_or_tag_name: release.tag,
    ref_type: 'tag',
    commit_sha: commit,
    stage: 'prod',
    metadata_url: `${door43}/${fullName}/raw/commit/${commit}/manifest.yaml`,
    metadata_json_url: `${door43}/api/v1/catalog/metadata/${fullName}/${release.tag}`,
    metadata_api_contents_url: `${door43}/api/v1/repos/${fullName}/contents/manifest.yaml?ref=${release.tag}`,
    metadata_type: 'rc',
    metadata_version: '0.2',
    content_format: contentFormats[release.flavor] ?? 'unknown',
    released: release.released,
    ingredients,
    books: release.books,
    relations: null,
    attachment_types: { pdf: false, audio: false, video: false, stream: false, other: false },
    is_valid: true,
    validation_errors_url: `${door43}/api/v1/catalog/validation/${fullName}/${release.tag}`,
    healthcheck_severity: 'success',
    is_healthy: true,
    is_healthy_without_warnings: true,
    healthcheck_url: `${door43}/api/v1/repos/${fullName}/healthcheck?ref=${release.tag}`,
  };
}

export const catalogLastUpdated = '2026-09-29T19:17:00Z';

export function catalogSearch(releases: readonly FixtureRelease[]) {
  return { ok: true, data: releases.map(catalogEntry), last_updated: catalogLastUpdated };
}

export function catalogLanguages(releases: readonly FixtureRelease[]) {
  return { ok: true, data: [...new Set(releases.map((release) => release.language.tag))].sort() };
}
