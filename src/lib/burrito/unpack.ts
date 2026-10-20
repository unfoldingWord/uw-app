import { Unzip, UnzipInflate } from 'fflate';
import type { Files } from '../ports';
import {
  defaultArchiveLimits,
  isUnsafePath,
  joined,
  mayHoldBurrito,
  rootOf,
  type ArchiveLimits,
} from './archive';
import { fromUtf8, metadataPath } from './files';
import { isLicenceFile } from './licence';
import type { BurritoFacts } from './validate';

export const archiveReadBytes = 64 * 1024;

const keptBytesLimit = 16 * 1024 * 1024;

type UnpackRule = 'archive-unreadable' | 'archive-path' | 'archive-too-large' | 'metadata-missing';

export type Unpacked =
  | {
      readonly ok: true;
      readonly directory: string | undefined;
      readonly facts: BurritoFacts;
      readonly written: readonly string[];
    }
  | { readonly ok: false; readonly rule: UnpackRule; readonly path: string };

function kept(path: string): boolean {
  const name = path.split('/').at(-1) ?? '';
  return name === metadataPath || isLicenceFile(name);
}

export type UnpackOptions = {
  readonly into?: string;
  readonly limits?: ArchiveLimits;
};

type Found = {
  readonly names: readonly string[];
  readonly sizes: ReadonlyMap<string, number>;
  readonly keptBytes: (path: string) => Promise<Uint8Array | undefined>;
};

type Refused = Extract<Unpacked, { ok: false }>;

function factsOf(found: Found, root: string): Promise<BurritoFacts> {
  const inner = (key: string): string => `${root}${key}`;
  const keptKeys = found.names.filter((path) => path.startsWith(root) && kept(path));
  return Promise.all(keptKeys.map(async (path) => [path, await found.keptBytes(path)] as const)).then(
    (pairs) => {
      const keptBytes = new Map(pairs);
      return {
        metadata: keptBytes.get(inner(metadataPath)),
        fact: (key) => {
          const size = found.sizes.get(inner(key));
          return size === undefined ? undefined : { size };
        },
        text: (key) => {
          const bytes = keptBytes.get(inner(key));
          return bytes === undefined ? undefined : fromUtf8(bytes);
        },
      };
    },
  );
}

async function peek(files: Files, archive: string, limits: ArchiveLimits): Promise<Found | Refused> {
  const names: string[] = [];
  const keptParts = new Map<string, Uint8Array[]>();
  const sizes = new Map<string, number>();
  const started = new Set<string>();
  let problem: Refused | undefined;
  let entries = 0;
  let keptTotal = 0;
  const unzip = new Unzip();
  unzip.register(UnzipInflate);
  unzip.onfile = (file) => {
    entries += 1;
    if (problem !== undefined) {
      return;
    }
    if (entries > limits.entries) {
      problem = { ok: false, rule: 'archive-too-large', path: file.name };
      return;
    }
    if (file.name.endsWith('/')) {
      return;
    }
    if (isUnsafePath(file.name)) {
      problem = { ok: false, rule: 'archive-path', path: file.name };
      return;
    }
    names.push(file.name);
    if (!mayHoldBurrito(file.name) || !kept(file.name)) {
      return;
    }
    started.add(file.name);
    file.ondata = (error, data, final) => {
      if (problem !== undefined) {
        return;
      }
      if (error !== null) {
        problem = { ok: false, rule: 'archive-unreadable', path: file.name };
        return;
      }
      keptTotal += data.byteLength;
      if (keptTotal > keptBytesLimit) {
        problem = { ok: false, rule: 'archive-too-large', path: file.name };
        return;
      }
      keptParts.set(file.name, [...(keptParts.get(file.name) ?? []), data]);
      if (final) {
        sizes.set(file.name, joined(keptParts.get(file.name) ?? []).byteLength);
      }
    };
    file.start();
  };
  const size = await files.size(archive);
  let offset = 0;
  do {
    const chunk = await files.readRange(archive, offset, archiveReadBytes);
    offset += archiveReadBytes;
    try {
      unzip.push(chunk, offset >= size);
    } catch {
      problem ??= { ok: false, rule: 'archive-unreadable', path: '' };
    }
  } while (offset < size && problem === undefined);
  if (problem !== undefined) {
    return problem;
  }
  if (names.length === 0 || [...started].some((path) => !sizes.has(path))) {
    return { ok: false, rule: 'archive-unreadable', path: '' };
  }
  return {
    names,
    sizes,
    keptBytes: async (path) => {
      const parts = keptParts.get(path);
      return parts === undefined ? undefined : joined(parts);
    },
  };
}

function unwantedRoots(names: readonly string[], wanted: readonly string[]): readonly string[] {
  const roots = new Set<string>();
  for (const path of names) {
    if (mayHoldBurrito(path)) {
      continue;
    }
    const parts = path.split('/');
    const shallowest = parts
      .slice(1)
      .map((_part, index) => parts.slice(0, index + 1).join('/'))
      .find((directory) => !wanted.some((kept) => kept.startsWith(`${directory}/`)));
    roots.add(shallowest ?? path);
  }
  return [...roots];
}

async function extractInto(
  files: Files,
  archive: string,
  into: string,
  limits: ArchiveLimits,
): Promise<Found | Refused> {
  const extracted = await files.extract(archive, into, limits);
  if (!extracted.ok) {
    return extracted;
  }
  const names = extracted.files.map((file) => file.path);
  const wantedPaths = names.filter(mayHoldBurrito);
  for (const path of unwantedRoots(names, wantedPaths)) {
    await files.remove(`${into}/${path}`);
  }
  const keptTotal = extracted.files
    .filter((file) => mayHoldBurrito(file.path) && kept(file.path))
    .reduce((sum, file) => sum + file.bytes, 0);
  if (keptTotal > keptBytesLimit) {
    return { ok: false, rule: 'archive-too-large', path: '' };
  }
  const wanted = extracted.files.filter((file) => mayHoldBurrito(file.path));
  return {
    names,
    sizes: new Map(wanted.map((file) => [file.path, file.bytes])),
    keptBytes: (path) => files.readBytes(`${into}/${path}`),
  };
}

export async function unpackArchive(
  files: Files,
  archive: string,
  options: UnpackOptions = {},
): Promise<Unpacked> {
  const limits = options.limits ?? defaultArchiveLimits;
  const { into } = options;
  const found =
    into === undefined ? await peek(files, archive, limits) : await extractInto(files, archive, into, limits);
  if ('ok' in found) {
    return found;
  }
  const root = rootOf(found.names);
  if (root === undefined) {
    return { ok: false, rule: 'metadata-missing', path: metadataPath };
  }
  const facts = await factsOf(found, root);
  const written =
    into === undefined
      ? []
      : [...found.sizes.keys()]
          .filter((path) => path.startsWith(root))
          .map((path) => path.slice(root.length));
  const directory = into === undefined ? undefined : root === '' ? into : `${into}/${root.slice(0, -1)}`;
  return { ok: true, directory, facts, written };
}

const endOfCentralDirectory = 0x06054b50;
const centralEntry = 0x02014b50;
const endRecordBytes = 22;
const longestComment = 0xffff;
const zip64Marker = 0xffffffff;

function readUint32(bytes: Uint8Array, at: number): number {
  return (
    ((bytes[at] ?? 0) | ((bytes[at + 1] ?? 0) << 8) | ((bytes[at + 2] ?? 0) << 16)) +
    (bytes[at + 3] ?? 0) * 0x1000000
  );
}

function readUint16(bytes: Uint8Array, at: number): number {
  return (bytes[at] ?? 0) | ((bytes[at + 1] ?? 0) << 8);
}

export async function unpackedBytes(files: Files, archive: string): Promise<number | undefined> {
  const size = await files.size(archive);
  const tailLength = Math.min(size, endRecordBytes + longestComment);
  const tail = await files.readRange(archive, size - tailLength, tailLength);
  let end = -1;
  for (let at = tail.byteLength - endRecordBytes; at >= 0; at -= 1) {
    if (readUint32(tail, at) === endOfCentralDirectory) {
      end = at;
      break;
    }
  }
  if (end === -1) {
    return undefined;
  }
  const directoryBytes = readUint32(tail, end + 12);
  const directoryOffset = readUint32(tail, end + 16);
  if (directoryBytes === zip64Marker || directoryOffset === zip64Marker) {
    return undefined;
  }
  const directory = await files.readRange(archive, directoryOffset, directoryBytes);
  let total = 0;
  let at = 0;
  while (at + 46 <= directory.byteLength && readUint32(directory, at) === centralEntry) {
    const uncompressed = readUint32(directory, at + 24);
    if (uncompressed === zip64Marker) {
      return undefined;
    }
    total += uncompressed;
    at +=
      46 + readUint16(directory, at + 28) + readUint16(directory, at + 30) + readUint16(directory, at + 32);
  }
  return total;
}
