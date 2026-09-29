import { packKinds, packSources, resourceRows, type PackId } from '../domain/pack';
import type { DbTransaction, DbRow } from '../ports';
import type { InstalledBurrito, InstalledPack } from './types';

export const packTables = ['packs', 'pack_burritos'] as const;

function textOf(row: DbRow, column: string): string {
  const value = row[column];
  return typeof value === 'string' ? value : '';
}

function numberOf(row: DbRow, column: string): number {
  const value = row[column];
  return typeof value === 'number' ? value : 0;
}

function burritoOf(row: DbRow): InstalledBurrito | undefined {
  const resourceRow = resourceRows.find((item) => item === row.resource_row);
  if (resourceRow === undefined) {
    return undefined;
  }
  return {
    root: textOf(row, 'root'),
    row: resourceRow,
    bytes: numberOf(row, 'bytes'),
    provenance: {
      publisher: textOf(row, 'publisher'),
      resource: textOf(row, 'resource'),
      language: textOf(row, 'language'),
      tag: textOf(row, 'tag'),
      commit: textOf(row, 'commit_sha'),
      licence: textOf(row, 'licence'),
      title: textOf(row, 'title'),
      ...(textOf(row, 'released') === '' ? {} : { released: textOf(row, 'released') }),
    },
  };
}

export async function readInstalledPacks(db: DbTransaction): Promise<InstalledPack[]> {
  const packRows = await db.all('SELECT pack, kind, language, source, bytes FROM packs ORDER BY pack');
  const burritoRows = await db.all(
    'SELECT pack, publisher, resource, language, tag, commit_sha, released, resource_row, root, title, licence, bytes FROM pack_burritos ORDER BY pack, publisher, resource',
  );
  return packRows.flatMap((row) => {
    const kind = packKinds.find((item) => item === row.kind);
    const source = packSources.find((item) => item === row.source);
    if (kind === undefined || source === undefined) {
      return [];
    }
    const pack = textOf(row, 'pack');
    return [
      {
        pack,
        kind,
        language: typeof row.language === 'string' ? row.language : undefined,
        source,
        bytes: numberOf(row, 'bytes'),
        burritos: burritoRows.filter((item) => item.pack === pack).flatMap((item) => burritoOf(item) ?? []),
      },
    ];
  });
}

export async function writeInstalledPack(session: DbTransaction, pack: InstalledPack): Promise<void> {
  await deleteInstalledPack(session, pack.pack);
  await session.run('INSERT INTO packs (pack, kind, language, source, bytes) VALUES (?, ?, ?, ?, ?)', [
    pack.pack,
    pack.kind,
    pack.language ?? null,
    pack.source,
    pack.bytes,
  ]);
  for (const burrito of pack.burritos) {
    const { provenance } = burrito;
    await session.run(
      'INSERT INTO pack_burritos (pack, publisher, resource, language, tag, commit_sha, released, resource_row, root, title, licence, bytes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        pack.pack,
        provenance.publisher,
        provenance.resource,
        provenance.language,
        provenance.tag,
        provenance.commit,
        provenance.released ?? '',
        burrito.row,
        burrito.root,
        provenance.title,
        provenance.licence,
        burrito.bytes,
      ],
    );
  }
}

export async function deleteInstalledPack(session: DbTransaction, pack: PackId): Promise<void> {
  await session.run('DELETE FROM pack_burritos WHERE pack = ?', [pack]);
  await session.run('DELETE FROM packs WHERE pack = ?', [pack]);
}
