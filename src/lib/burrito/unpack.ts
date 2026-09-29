import { md5 } from '@noble/hashes/legacy.js';
import { bytesToHex } from '@noble/hashes/utils.js';
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
import { isLicenceFile, type BurritoFacts, type IngredientFact } from './validate';

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

type Chunk = { readonly path: string; readonly data: Uint8Array; readonly final: boolean };

type Hashing = { readonly hash: ReturnType<typeof md5.create>; size: number; started: boolean };

function kept(path: string): boolean {
  const name = path.split('/').at(-1) ?? '';
  return name === metadataPath || isLicenceFile(name);
}

function parentOf(path: string): string {
  const index = path.lastIndexOf('/');
  return index === -1 ? '' : path.slice(0, index);
}

export type UnpackOptions = {
  readonly into?: string;
  readonly limits?: ArchiveLimits;
  readonly hash?: boolean;
};

export async function unpackArchive(
  files: Files,
  archive: string,
  options: UnpackOptions = {},
): Promise<Unpacked> {
  const limits = options.limits ?? defaultArchiveLimits;
  const { into } = options;
  const hashed = options.hash !== false;
  const names: string[] = [];
  const queue: Chunk[] = [];
  const hashing = new Map<string, Hashing>();
  const facts = new Map<string, IngredientFact>();
  const keptParts = new Map<string, Uint8Array[]>();
  const madeDirectories = new Set<string>();
  let problem: { rule: UnpackRule; path: string } | undefined;
  let entries = 0;
  let total = 0;
  let keptTotal = 0;
  const unzip = new Unzip();
  unzip.register(UnzipInflate);
  unzip.onfile = (file) => {
    entries += 1;
    if (problem !== undefined) {
      return;
    }
    if (entries > limits.entries) {
      problem = { rule: 'archive-too-large', path: file.name };
      return;
    }
    if (file.name.endsWith('/')) {
      return;
    }
    if (isUnsafePath(file.name)) {
      problem = { rule: 'archive-path', path: file.name };
      return;
    }
    names.push(file.name);
    if (!mayHoldBurrito(file.name)) {
      return;
    }
    hashing.set(file.name, { hash: md5.create(), size: 0, started: false });
    file.ondata = (error, data, final) => {
      if (problem !== undefined) {
        return;
      }
      if (error !== null) {
        problem = { rule: 'archive-unreadable', path: file.name };
        return;
      }
      total += data.byteLength;
      if (total > limits.bytes) {
        problem = { rule: 'archive-too-large', path: file.name };
        return;
      }
      queue.push({ path: file.name, data, final });
    };
    file.start();
  };

  async function take(chunk: Chunk): Promise<void> {
    const state = hashing.get(chunk.path);
    if (state === undefined) {
      return;
    }
    if (hashed) {
      state.hash.update(chunk.data);
    }
    state.size += chunk.data.byteLength;
    if (kept(chunk.path)) {
      keptTotal += chunk.data.byteLength;
      if (keptTotal > keptBytesLimit) {
        problem = { rule: 'archive-too-large', path: chunk.path };
        return;
      }
      keptParts.set(chunk.path, [...(keptParts.get(chunk.path) ?? []), chunk.data]);
    }
    if (into !== undefined) {
      const target = `${into}/${chunk.path}`;
      const directory = parentOf(target);
      if (!madeDirectories.has(directory)) {
        await files.mkdir(directory);
        madeDirectories.add(directory);
      }
      if (state.started) {
        await files.appendBytes(target, chunk.data);
      } else {
        await files.writeBytes(target, chunk.data);
      }
    }
    state.started = true;
    if (chunk.final) {
      facts.set(chunk.path, { size: state.size, md5: hashed ? bytesToHex(state.hash.digest()) : '' });
    }
  }

  const size = await files.size(archive);
  let offset = 0;
  do {
    const chunk = await files.readRange(archive, offset, archiveReadBytes);
    offset += archiveReadBytes;
    try {
      unzip.push(chunk, offset >= size);
    } catch {
      problem ??= { rule: 'archive-unreadable', path: '' };
    }
    while (queue.length > 0 && problem === undefined) {
      const next = queue.shift();
      if (next !== undefined) {
        await take(next);
      }
    }
    queue.length = 0;
  } while (offset < size && problem === undefined);

  if (problem !== undefined) {
    return { ok: false, ...problem };
  }
  if (names.length === 0 || [...hashing.keys()].some((path) => !facts.has(path))) {
    return { ok: false, rule: 'archive-unreadable', path: '' };
  }
  const root = rootOf(names);
  if (root === undefined) {
    return { ok: false, rule: 'metadata-missing', path: metadataPath };
  }
  const inner = (key: string): string => `${root}${key}`;
  const keptBytes = (key: string): Uint8Array | undefined => {
    const parts = keptParts.get(inner(key));
    return parts === undefined ? undefined : joined(parts);
  };
  const burritoFacts: BurritoFacts = {
    metadata: keptBytes(metadataPath),
    fact: (key) => facts.get(inner(key)),
    text: (key) => {
      const bytes = keptBytes(key);
      return bytes === undefined ? undefined : fromUtf8(bytes);
    },
  };
  const written = [...facts.keys()]
    .filter((path) => path.startsWith(root))
    .map((path) => path.slice(root.length));
  const directory = into === undefined ? undefined : root === '' ? into : `${into}/${root.slice(0, -1)}`;
  return { ok: true, directory, facts: burritoFacts, written };
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
