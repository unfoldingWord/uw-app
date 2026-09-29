import { isRecord } from '../burrito/metadata';
import { comparePublishers, compareText } from '../order';
import { fieldValidators } from '../domain/fields';
import { packIdOf, packKindOf } from '../domain/pack';
import { archiveUrlOf, resourceKey } from '../domain/release';
import { rowOfSubject } from './subjects';
import type { CatalogRelease } from './types';

export type CatalogPage = { ok: true; releases: readonly CatalogRelease[]; entries: number } | { ok: false };

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
    bytes: undefined,
    autonym: field(entry, 'language_title') ?? language,
    direction: field(entry, 'language_direction') === 'rtl' ? 'rtl' : 'ltr',
  };
}

export function normalizePage(document: unknown): CatalogPage {
  if (!isRecord(document) || document.ok === false || !Array.isArray(document.data)) {
    return { ok: false };
  }
  const entries: readonly unknown[] = document.data;
  const releases = entries.flatMap((entry) => normalizeEntry(entry) ?? []);
  return { ok: true, releases, entries: entries.length };
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
