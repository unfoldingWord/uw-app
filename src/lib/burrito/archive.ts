import { Unzip, UnzipInflate, zipSync, type ZipAttributes, type Zippable } from 'fflate';
import { ingredientsDirectory, metadataPath, type BurritoFiles } from './files';

type ArchiveRule = 'archive-unreadable' | 'archive-path' | 'archive-too-large' | 'metadata-missing';

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

export function isUnsafePath(path: string): boolean {
  return path.startsWith('/') || path.includes('\\') || path.split('/').some((segment) => segment === '..');
}

export function rootOf(paths: readonly string[]): string | undefined {
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

export type ArchiveLimits = { readonly entries: number; readonly bytes: number };

export const defaultArchiveLimits: ArchiveLimits = Object.freeze({
  entries: 20_000,
  bytes: 512 * 1024 * 1024,
});

export type ArchiveReader = {
  push(chunk: Uint8Array, final: boolean): void;
  finish(): ArchiveRead;
};

type Refusal = Extract<ArchiveRead, { ok: false }>;

function refusal(rule: ArchiveRule, path: string, message: string): Refusal {
  return { ok: false, rule, path, message };
}

export function mayHoldBurrito(path: string): boolean {
  const parts = path.split('/');
  const inner = parts.slice(1).join('/');
  return (
    path === metadataPath ||
    path.startsWith(ingredientsDirectory) ||
    inner === metadataPath ||
    inner.startsWith(ingredientsDirectory)
  );
}

export function joined(parts: readonly Uint8Array[]): Uint8Array {
  const total = parts.reduce((sum, part) => sum + part.byteLength, 0);
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    bytes.set(part, offset);
    offset += part.byteLength;
  }
  return bytes;
}

type Extracted = { parts: Uint8Array[]; complete: boolean };

export function createArchiveReader(limits: ArchiveLimits = defaultArchiveLimits): ArchiveReader {
  const names: string[] = [];
  const extracted = new Map<string, Extracted>();
  let problem: Refusal | undefined;
  let entries = 0;
  let total = 0;
  const unzip = new Unzip();
  unzip.register(UnzipInflate);
  unzip.onfile = (file) => {
    entries += 1;
    if (problem !== undefined) {
      return;
    }
    if (entries > limits.entries) {
      problem = refusal(
        'archive-too-large',
        file.name,
        `the archive holds more than ${limits.entries} entries`,
      );
      return;
    }
    if (file.name.endsWith('/')) {
      return;
    }
    if (isUnsafePath(file.name)) {
      problem = refusal('archive-path', file.name, `the archive holds an unsafe path ${file.name}`);
      return;
    }
    names.push(file.name);
    if (!mayHoldBurrito(file.name)) {
      return;
    }
    const entry: Extracted = { parts: [], complete: false };
    extracted.set(file.name, entry);
    file.ondata = (error, data, final) => {
      if (problem !== undefined) {
        return;
      }
      if (error !== null) {
        problem = refusal('archive-unreadable', file.name, `${file.name} does not decompress`);
        return;
      }
      total += data.byteLength;
      if (total > limits.bytes) {
        problem = refusal(
          'archive-too-large',
          file.name,
          `the archive unpacks to more than ${limits.bytes} bytes`,
        );
        file.terminate();
        return;
      }
      entry.parts.push(data);
      entry.complete = final;
    };
    file.start();
  };

  function finish(): ArchiveRead {
    if (problem !== undefined) {
      return problem;
    }
    if (names.length === 0 || [...extracted.values()].some((entry) => !entry.complete)) {
      return refusal('archive-unreadable', '', 'the archive is not a readable zip');
    }
    const root = rootOf(names);
    if (root === undefined) {
      return refusal(
        'metadata-missing',
        metadataPath,
        'the archive has no metadata.json at its root or under one top-level directory',
      );
    }
    const files = new Map<string, Uint8Array>();
    const discarded: string[] = [];
    for (const path of [...names].sort()) {
      const inner = path.startsWith(root) ? path.slice(root.length) : undefined;
      const content = extracted.get(path);
      if (
        content !== undefined &&
        inner !== undefined &&
        (inner === metadataPath || inner.startsWith(ingredientsDirectory))
      ) {
        files.set(inner, joined(content.parts));
      } else {
        discarded.push(path);
      }
    }
    return { ok: true, files, root: root.replace(/\/$/, ''), discarded };
  }

  return {
    push(chunk, final) {
      if (problem !== undefined) {
        return;
      }
      try {
        unzip.push(chunk, final);
      } catch {
        problem = refusal('archive-unreadable', '', 'the archive is not a readable zip');
      }
    },
    finish,
  };
}

export function readArchive(bytes: Uint8Array, limits: ArchiveLimits = defaultArchiveLimits): ArchiveRead {
  const reader = createArchiveReader(limits);
  reader.push(bytes, true);
  return reader.finish();
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
