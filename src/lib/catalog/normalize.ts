import { isRecord } from '../burrito/metadata';
import { comparePublishers, compareText } from '../order';
import { fieldValidators } from '../domain/fields';
import { packIdOf, packKindOf } from '../domain/pack';
import { archiveUrlOf, resourceKey } from '../domain/release';
import { isAllowedUrl } from '../network';
import { rowOfSubject } from './subjects';
import type { CatalogRelease, LanguageName, ReleaseAsset } from './types';

export type CatalogPage =
  { ok: true; releases: readonly CatalogRelease[]; entries: number; dropped: number } | { ok: false };

function text(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined;
}

function field(entry: Record<string, unknown>, name: string): string | undefined {
  const repo = isRecord(entry.repo) ? entry.repo : {};
  return text(entry[name]) ?? text(repo[name]);
}

function publishedOf(entry: Record<string, unknown>): string {
  const release = isRecord(entry.release) ? entry.release : {};
  return text(entry.released) ?? text(release.published_at) ?? '';
}

const audioAssetName = /\.(m4a|mp3)$/i;

function audioAssetsOf(entry: Record<string, unknown>): ReleaseAsset[] {
  const attachments = isRecord(entry.attachment_types) ? entry.attachment_types : {};
  const release = isRecord(entry.release) ? entry.release : {};
  if (attachments.audio !== true || !Array.isArray(release.assets)) {
    return [];
  }
  const assets: readonly unknown[] = release.assets;
  return assets.flatMap((asset) => {
    if (!isRecord(asset)) {
      return [];
    }
    const name = text(asset.name);
    const url = text(asset.browser_download_url);
    if (name === undefined || url === undefined || !audioAssetName.test(name) || !isAllowedUrl(url)) {
      return [];
    }
    const size = asset.size;
    return [{ name, url, bytes: typeof size === 'number' && size >= 0 ? size : undefined }];
  });
}

function ingredientBytesOf(entry: Record<string, unknown>): number | undefined {
  const repo = isRecord(entry.repo) ? entry.repo : {};
  const listed = Array.isArray(entry.ingredients)
    ? entry.ingredients
    : Array.isArray(repo.ingredients)
      ? repo.ingredients
      : [];
  const ingredients: readonly unknown[] = listed;
  const total = ingredients.reduce<number>((sum, ingredient) => {
    const size = isRecord(ingredient) ? ingredient.size : undefined;
    return sum + (typeof size === 'number' && Number.isFinite(size) && size > 0 ? size : 0);
  }, 0);
  return total > 0 ? total : undefined;
}

export function normalizeEntry(entry: unknown): CatalogRelease | undefined {
  if (!isRecord(entry)) {
    return undefined;
  }
  const [ownerFromName, nameFromName] = (text(entry.full_name) ?? '').split('/');
  const publisher = text(entry.owner) ?? ownerFromName;
  const resource = text(entry.name) ?? nameFromName;
  const tag = text(entry.branch_or_tag_name);
  const language = field(entry, 'language');
  const commit = text(entry.commit_sha);
  const subject = field(entry, 'subject') ?? '';
  const stage = text(entry.stage);
  if (
    !fieldValidators.publisher(publisher) ||
    !fieldValidators.resource(resource) ||
    !fieldValidators.tag(tag) ||
    !fieldValidators.language(language) ||
    !fieldValidators.token(commit) ||
    (stage !== undefined && stage !== 'prod') ||
    publisher === undefined ||
    resource === undefined ||
    tag === undefined ||
    language === undefined ||
    commit === undefined
  ) {
    return undefined;
  }
  const row = rowOfSubject(subject);
  const kind = row === undefined ? undefined : packKindOf(row, language);
  return {
    publisher,
    resource,
    language,
    tag,
    commit,
    title: field(entry, 'title') ?? resource,
    subject,
    archiveUrl: archiveUrlOf({ publisher, resource, tag }),
    published: publishedOf(entry),
    row,
    kind,
    pack: kind === undefined ? undefined : packIdOf(kind, language, resource),
    bytes: ingredientBytesOf(entry),
    autonym: field(entry, 'language_title') ?? language,
    direction: field(entry, 'language_direction') === 'rtl' ? 'rtl' : 'ltr',
    assets: audioAssetsOf(entry),
    built: undefined,
  };
}

export function normalizePage(document: unknown): CatalogPage {
  if (!isRecord(document) || document.ok === false || !Array.isArray(document.data)) {
    return { ok: false };
  }
  const entries: readonly unknown[] = document.data;
  const releases = entries.flatMap((entry) => normalizeEntry(entry) ?? []);
  return { ok: true, releases, entries: entries.length, dropped: entries.length - releases.length };
}

export function uniqueReleases(releases: readonly CatalogRelease[]): CatalogRelease[] {
  const seen = new Set<string>();
  return releases.filter((release) => {
    const key = resourceKey(release);
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

export function compareReleases(left: CatalogRelease, right: CatalogRelease): number {
  return (
    comparePublishers(left.publisher, right.publisher) ||
    compareText(left.resource, right.resource) ||
    compareText(left.tag, right.tag)
  );
}

function languageNameOf(item: unknown): [string, LanguageName] | undefined {
  if (!isRecord(item)) {
    return undefined;
  }
  const code = text(item.lc);
  const englishName = text(item.ang);
  if (code === undefined || englishName === undefined || !fieldValidators.language(code)) {
    return undefined;
  }
  return [
    code,
    {
      englishName,
      autonym: text(item.ln) ?? englishName,
      direction: text(item.ld) === 'rtl' ? 'rtl' : 'ltr',
    },
  ];
}

export function normalizeLanguageNames(document: unknown): Map<string, LanguageName> | undefined {
  if (!isRecord(document) || document.ok === false || !Array.isArray(document.data)) {
    return undefined;
  }
  const entries: readonly unknown[] = document.data;
  return new Map(
    entries.flatMap((item) => {
      const found = languageNameOf(item);
      return found === undefined ? [] : [found];
    }),
  );
}
