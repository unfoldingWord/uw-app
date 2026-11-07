import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { format, resolveConfig } from 'prettier';
import { packIdOf, packKindOf, resourceRows, type ResourceRow } from '@lib/domain/pack';
import { archiveUrlOf } from '@lib/domain/release';
import { isAllowedUrl } from '@lib/network';
import type { BundledArchive } from '@lib/ports';
import type { BuiltBundle } from '@sim/bundled';

const repositoryRoot = join(import.meta.dirname, '..', '..');

export const lockPath = join(repositoryRoot, 'content', 'bundled.lock.json');

export const carriedDirectory = join(repositoryRoot, 'content', 'bundled');

export const platformModulePath = join(repositoryRoot, 'src', 'platform', 'bundled-archives.ts');

export const lockFormat = 'uw-bundled-lock';

export type LockedArchive = BundledArchive & {
  readonly url: string;
  readonly sha256: string;
  readonly built?: 'images';
};

export type BundledLock = {
  readonly format: typeof lockFormat;
  readonly version: 1;
  readonly language: string;
  readonly resolved: string;
  readonly archives: readonly LockedArchive[];
};

export type LockRead = { ok: true; lock: BundledLock } | { ok: false; reason: string };

const archiveFile = /^[a-z0-9_]+\.zip$/;

const sha256Shape = /^[0-9a-f]{64}$/;

export function sha256Of(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
}

function textField(record: Record<string, unknown>, field: string): string | undefined {
  const value = record[field];
  return typeof value === 'string' && value !== '' ? value : undefined;
}

function archiveProblem(archive: LockedArchive): string | undefined {
  if (!archiveFile.test(archive.file)) {
    return `${archive.file} is not a lowercase name an Android resource can carry`;
  }
  if (!sha256Shape.test(archive.sha256)) {
    return `${archive.file} has no sha256`;
  }
  if (!Number.isInteger(archive.bytes) || archive.bytes <= 0) {
    return `${archive.file} has no size`;
  }
  if (!isAllowedUrl(archive.url) || archive.url !== archiveUrlOf(archive)) {
    return `${archive.file} names ${archive.url}, not the Door43 burrito archive of its release`;
  }
  const kind = packKindOf(archive.row, archive.language);
  if (packIdOf(kind, archive.language, archive.resource) !== archive.pack) {
    return `${archive.file} is a ${archive.row} burrito, which does not belong in ${archive.pack}`;
  }
  if ((archive.row === 'images') !== (archive.built === 'images')) {
    return `${archive.file}: only the Image Pack is built from its release`;
  }
  return undefined;
}

function archiveOf(value: unknown): LockedArchive | string {
  if (typeof value !== 'object' || value === null) {
    return 'an archive is not an object';
  }
  const record = value as Record<string, unknown>;
  const fields = [
    'file',
    'pack',
    'publisher',
    'resource',
    'language',
    'tag',
    'commit',
    'title',
    'subject',
    'published',
    'url',
    'sha256',
  ] as const;
  const read: Partial<Record<(typeof fields)[number], string>> = {};
  for (const field of fields) {
    const text = textField(record, field);
    if (text === undefined) {
      return `an archive has no ${field}`;
    }
    read[field] = text;
  }
  const row = resourceRows.find((item): item is ResourceRow => item === record.row);
  if (row === undefined || typeof record.bytes !== 'number') {
    return `${read.file ?? 'an archive'} has no resource row or size`;
  }
  const archive: LockedArchive = {
    file: read.file ?? '',
    pack: read.pack ?? '',
    row,
    publisher: read.publisher ?? '',
    resource: read.resource ?? '',
    language: read.language ?? '',
    tag: read.tag ?? '',
    commit: read.commit ?? '',
    title: read.title ?? '',
    subject: read.subject ?? '',
    published: read.published ?? '',
    bytes: record.bytes,
    url: read.url ?? '',
    sha256: read.sha256 ?? '',
    ...(record.built === 'images' ? { built: 'images' as const } : {}),
  };
  return archiveProblem(archive) ?? archive;
}

export function parseLock(text: string): LockRead {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, reason: 'the lock file is not JSON' };
  }
  if (typeof parsed !== 'object' || parsed === null) {
    return { ok: false, reason: 'the lock file is not an object' };
  }
  const record = parsed as Record<string, unknown>;
  if (record.format !== lockFormat || record.version !== 1) {
    return { ok: false, reason: `the lock file is not ${lockFormat} version 1` };
  }
  const language = textField(record, 'language');
  const resolved = textField(record, 'resolved');
  if (language === undefined || resolved === undefined || !Array.isArray(record.archives)) {
    return { ok: false, reason: 'the lock file names no language, date or archives' };
  }
  const archives: LockedArchive[] = [];
  for (const item of record.archives as unknown[]) {
    const archive = archiveOf(item);
    if (typeof archive === 'string') {
      return { ok: false, reason: archive };
    }
    archives.push(archive);
  }
  if (archives.length === 0) {
    return { ok: false, reason: 'the lock file pins no archives, and the app never ships without content' };
  }
  if (new Set(archives.map((archive) => archive.file)).size !== archives.length) {
    return { ok: false, reason: 'two archives share a file name' };
  }
  return { ok: true, lock: { format: lockFormat, version: 1, language, resolved, archives } };
}

export function lockOf(bundle: BuiltBundle, language: string, resolved: string): BundledLock {
  return {
    format: lockFormat,
    version: 1,
    language,
    resolved,
    archives: bundle.archives.map((archive) => {
      const bytes = bundle.bytes.get(archive.file);
      const url = bundle.urls.get(archive.file);
      if (bytes === undefined || url === undefined) {
        throw new Error(`the bundle has no bytes or address for ${archive.file}`);
      }
      return {
        ...archive,
        url,
        sha256: sha256Of(bytes),
        ...(archive.row === 'images' ? { built: 'images' as const } : {}),
      };
    }),
  };
}

function identifierOf(file: string): string {
  const words = file.replace(/\.zip$/, '').split('_');
  return `${words.map((word, index) => (index === 0 ? word : `${word.charAt(0).toUpperCase()}${word.slice(1)}`)).join('')}Archive`;
}

function carriedEntry(archive: LockedArchive): string {
  const fields: readonly (keyof BundledArchive)[] = [
    'file',
    'pack',
    'row',
    'publisher',
    'resource',
    'language',
    'tag',
    'commit',
    'title',
    'subject',
    'published',
    'bytes',
  ];
  const lines = fields.map((field) => `${field}: ${JSON.stringify(archive[field])},`);
  return `{ ${lines.join(' ')} asset: ${identifierOf(archive.file)} },`;
}

async function formatted(source: string, path: string): Promise<string> {
  const config = (await resolveConfig(path)) ?? {};
  return format(source, { ...config, filepath: path });
}

export async function platformModule(lock: BundledLock): Promise<string> {
  const imports = lock.archives.map(
    (archive) => `import ${identifierOf(archive.file)} from '@content/bundled/${archive.file}';`,
  );
  const source = [
    "import type { BundledArchive } from '@lib/ports';",
    ...imports,
    '',
    'export type CarriedArchive = BundledArchive & { readonly asset: number };',
    '',
    `export const carriedArchives: readonly CarriedArchive[] = [${lock.archives.map(carriedEntry).join(' ')}];`,
    '',
  ].join('\n');
  return formatted(source, platformModulePath);
}

export async function lockText(lock: BundledLock): Promise<string> {
  return formatted(`${JSON.stringify(lock, null, 2)}\n`, lockPath);
}
