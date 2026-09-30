import { packKinds, resourceRows, type PackKind, type ResourceRow } from '../domain/pack';
import type { DbTransaction, DbRow, SqlValue } from '../ports';
import { isRecord } from '../burrito/metadata';
import { withBuiltReleases } from './built';
import type { CatalogRelease, LanguageName, ReleaseAsset } from './types';

export const catalogTables = ['catalog_releases', 'catalog_languages'] as const;

const columns = [
  'publisher',
  'resource',
  'language',
  'tag',
  'commit_sha',
  'title',
  'subject',
  'archive_url',
  'published',
  'resource_row',
  'pack_kind',
  'pack',
  'bytes',
  'autonym',
  'direction',
  'assets',
] as const;

function valuesOf(release: CatalogRelease): SqlValue[] {
  return [
    release.publisher,
    release.resource,
    release.language,
    release.tag,
    release.commit,
    release.title,
    release.subject,
    release.archiveUrl,
    release.published,
    release.row ?? null,
    release.kind ?? null,
    release.pack ?? null,
    release.bytes ?? null,
    release.autonym,
    release.direction,
    JSON.stringify(release.assets),
  ];
}

function textOf(row: DbRow, column: string): string {
  const value = row[column];
  return typeof value === 'string' ? value : '';
}

function oneOf<T extends string>(values: readonly T[], value: unknown): T | undefined {
  return values.find((item) => item === value);
}

function assetsOf(value: SqlValue | undefined): ReleaseAsset[] {
  if (typeof value !== 'string') {
    return [];
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    return [];
  }
  const items: readonly unknown[] = Array.isArray(parsed) ? parsed : [];
  return items.flatMap((item) =>
    isRecord(item) && typeof item.name === 'string' && typeof item.url === 'string'
      ? [{ name: item.name, url: item.url, bytes: typeof item.bytes === 'number' ? item.bytes : undefined }]
      : [],
  );
}

function releaseOf(row: DbRow): CatalogRelease {
  const bytes = row.bytes;
  return {
    publisher: textOf(row, 'publisher'),
    resource: textOf(row, 'resource'),
    language: textOf(row, 'language'),
    tag: textOf(row, 'tag'),
    commit: textOf(row, 'commit_sha'),
    title: textOf(row, 'title'),
    subject: textOf(row, 'subject'),
    archiveUrl: textOf(row, 'archive_url'),
    published: textOf(row, 'published'),
    row: oneOf<ResourceRow>(resourceRows, row.resource_row),
    kind: oneOf<PackKind>(packKinds, row.pack_kind),
    pack: typeof row.pack === 'string' ? row.pack : undefined,
    bytes: typeof bytes === 'number' ? bytes : undefined,
    autonym: textOf(row, 'autonym'),
    direction: row.direction === 'rtl' ? 'rtl' : 'ltr',
    assets: assetsOf(row.assets),
    built: undefined,
  };
}

export async function readCatalogReleases(db: DbTransaction): Promise<CatalogRelease[]> {
  const rows = await db.all(`SELECT ${columns.join(', ')} FROM catalog_releases ORDER BY position`);
  return withBuiltReleases(rows.map(releaseOf));
}

export async function replaceCatalogReleases(
  session: DbTransaction,
  releases: readonly CatalogRelease[],
): Promise<void> {
  await session.run('DELETE FROM catalog_releases');
  const placeholders = [...columns, 'position'].map(() => '?').join(', ');
  const stored = releases.filter((release) => release.built === undefined);
  for (const [position, release] of stored.entries()) {
    await session.run(
      `INSERT INTO catalog_releases (${columns.join(', ')}, position) VALUES (${placeholders})`,
      [...valuesOf(release), position],
    );
  }
}

export async function readLanguageNames(db: DbTransaction): Promise<Map<string, LanguageName>> {
  const rows = await db.all('SELECT language, english_name, autonym, direction FROM catalog_languages');
  return new Map(
    rows.map((row) => [
      textOf(row, 'language'),
      {
        englishName: textOf(row, 'english_name'),
        autonym: textOf(row, 'autonym'),
        direction: row.direction === 'rtl' ? 'rtl' : 'ltr',
      },
    ]),
  );
}

export async function replaceLanguageNames(
  session: DbTransaction,
  names: ReadonlyMap<string, LanguageName>,
): Promise<void> {
  await session.run('DELETE FROM catalog_languages');
  for (const [language, name] of names) {
    await session.run(
      'INSERT INTO catalog_languages (language, english_name, autonym, direction) VALUES (?, ?, ?, ?)',
      [language, name.englishName, name.autonym, name.direction],
    );
  }
}
