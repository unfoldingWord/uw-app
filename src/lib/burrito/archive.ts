import { unzipSync, zipSync, type ZipAttributes, type Zippable } from 'fflate';
import { ingredientsDirectory, metadataPath, type BurritoFiles } from './files';

type ArchiveRule = 'archive-unreadable' | 'archive-path' | 'metadata-missing';

export type ArchiveRead =
  | {
      readonly ok: true;
      readonly files: BurritoFiles;
      readonly root: string;
      readonly discarded: readonly string[];
    }
  | { readonly ok: false; readonly rule: ArchiveRule; readonly path: string; readonly message: string };

type ArchiveMtime = NonNullable<ZipAttributes['mtime']>;

export type WriteArchiveOptions = { readonly root?: string; readonly mtime: ArchiveMtime };

function isUnsafe(path: string): boolean {
  return path.startsWith('/') || path.includes('\\') || path.split('/').some((segment) => segment === '..');
}

function rootOf(paths: readonly string[]): string | undefined {
  if (paths.includes(metadataPath)) {
    return '';
  }
  const nested = paths.filter((path) => {
    const parts = path.split('/');
    return parts.length === 2 && parts[1] === metadataPath;
  });
  const [only] = nested;
  return nested.length === 1 && only !== undefined ? only.slice(0, -metadataPath.length) : undefined;
}

export function readArchive(bytes: Uint8Array): ArchiveRead {
  let entries: Record<string, Uint8Array>;
  try {
    entries = unzipSync(bytes);
  } catch {
    return { ok: false, rule: 'archive-unreadable', path: '', message: 'the archive is not a readable zip' };
  }
  const paths = Object.keys(entries).filter((path) => !path.endsWith('/'));
  const unsafe = paths.find(isUnsafe);
  if (unsafe !== undefined) {
    return {
      ok: false,
      rule: 'archive-path',
      path: unsafe,
      message: `the archive holds an unsafe path ${unsafe}`,
    };
  }
  const root = rootOf(paths);
  if (root === undefined) {
    return {
      ok: false,
      rule: 'metadata-missing',
      path: metadataPath,
      message: 'the archive has no metadata.json at its root or under one top-level directory',
    };
  }
  const files = new Map<string, Uint8Array>();
  const discarded: string[] = [];
  for (const path of paths.sort()) {
    const inner = path.startsWith(root) ? path.slice(root.length) : undefined;
    const content = entries[path];
    if (
      content &&
      inner !== undefined &&
      (inner === metadataPath || inner.startsWith(ingredientsDirectory))
    ) {
      files.set(inner, content);
    } else {
      discarded.push(path);
    }
  }
  return { ok: true, files, root: root.replace(/\/$/, ''), discarded };
}

export function writeArchive(files: BurritoFiles, options: WriteArchiveOptions): Uint8Array {
  const prefix = options.root ? `${options.root}/` : '';
  const zippable: Zippable = {};
  for (const path of [...files.keys()].sort()) {
    const content = files.get(path);
    if (content) {
      zippable[`${prefix}${path}`] = content;
    }
  }
  return zipSync(zippable, { mtime: options.mtime, level: 6 });
}
