import type { FileEntry, Files } from '@lib/ports';
import { portError } from './errors';

export type FileWrite = 'write' | 'append' | 'mkdir' | 'rename' | 'remove' | 'adopt';

export type FileRead = 'bytes' | 'text' | 'range';

export type MemoryFiles = Files & {
  setCapacity(bytes: number): void;
  failWrites(fail: boolean): void;
  failRename(targetPrefix: string, times?: number): void;
  offerExternal(external: string, data: Uint8Array): void;
  externalBytes(external: string): number | undefined;
  onWrite(listener: (operation: FileWrite, path: string, bytes: number) => void): () => void;
  onRead(listener: (operation: FileRead, path: string, bytes: number) => void): () => void;
  used(): number;
  tree(): readonly string[];
};

type Stored = { parts: Uint8Array[]; length: number };

export const memoryUriScheme = 'memory://device/';

const defaultCapacity = 1024 * 1024 * 1024;

function normalize(path: string): string {
  const parts = path.split('/').filter((part) => part !== '');
  if (parts.some((part) => part === '.' || part === '..')) {
    throw portError('files.io', `${path} leaves the device root`);
  }
  return parts.join('/');
}

function parentOf(path: string): string {
  const index = path.lastIndexOf('/');
  return index === -1 ? '' : path.slice(0, index);
}

function within(path: string, directory: string): boolean {
  return directory === '' || path === directory || path.startsWith(`${directory}/`);
}

function whole(stored: Stored): Uint8Array {
  if (stored.parts.length === 1 && stored.parts[0] !== undefined) {
    return stored.parts[0];
  }
  const joined = new Uint8Array(stored.length);
  let offset = 0;
  for (const part of stored.parts) {
    joined.set(part, offset);
    offset += part.byteLength;
  }
  stored.parts = [joined];
  return joined;
}

function rangeOf(stored: Stored, offset: number, length: number): Uint8Array {
  const end = Math.min(stored.length, offset + length);
  const out = new Uint8Array(Math.max(0, end - offset));
  let at = 0;
  for (const part of stored.parts) {
    const start = Math.max(offset, at);
    const stop = Math.min(end, at + part.byteLength);
    if (stop > start) {
      out.set(part.subarray(start - at, stop - at), start - offset);
    }
    at += part.byteLength;
    if (at >= end) {
      break;
    }
  }
  return out;
}

export function createMemoryFiles(options: { capacity?: number } = {}): MemoryFiles {
  const files = new Map<string, Stored>();
  const external = new Map<string, Uint8Array>();
  const directories = new Set<string>(['']);
  const writeListeners = new Set<(operation: FileWrite, path: string, bytes: number) => void>();
  const readListeners = new Set<(operation: FileRead, path: string, bytes: number) => void>();
  let capacity = options.capacity ?? defaultCapacity;
  let failing = false;
  let usedBytes = 0;
  const renameFailures: { prefix: string; remaining: number }[] = [];

  function guardRename(target: string): void {
    const failure = renameFailures.find((item) => item.remaining > 0 && within(target, item.prefix));
    if (failure !== undefined) {
      failure.remaining -= 1;
      throw portError('files.io', `rename onto ${target} refused`);
    }
  }

  function guardWrite(operation: FileWrite, path: string, bytes = 0): void {
    for (const listener of writeListeners) {
      listener(operation, path, bytes);
    }
    if (failing) {
      throw portError('files.io', `write to ${path} refused`);
    }
  }

  function requireDirectory(path: string): void {
    if (!directories.has(path)) {
      throw portError('files.not-found', `${path || '/'} is not a directory`);
    }
  }

  function stored(path: string): Stored {
    const found = files.get(normalize(path));
    if (found === undefined) {
      throw portError('files.not-found', `${path} does not exist`);
    }
    return found;
  }

  function read(operation: FileRead, path: string): Uint8Array {
    const data = whole(stored(path)).slice();
    for (const listener of readListeners) {
      listener(operation, normalize(path), data.byteLength);
    }
    return data;
  }

  function writable(operation: FileWrite, path: string, bytes: number): string {
    const target = normalize(path);
    guardWrite(operation, target, bytes);
    if (target === '' || directories.has(target)) {
      throw portError('files.io', `${path} is a directory`);
    }
    requireDirectory(parentOf(target));
    return target;
  }

  function reserve(growth: number, bytes: number): void {
    if (usedBytes + growth > capacity) {
      throw portError('files.no-space', `${bytes} bytes do not fit`);
    }
    usedBytes += growth;
  }

  function write(operation: FileWrite, path: string, data: Uint8Array): void {
    const target = writable(operation, path, data.byteLength);
    reserve(data.byteLength - (files.get(target)?.length ?? 0), data.byteLength);
    files.set(target, { parts: [data.slice()], length: data.byteLength });
  }

  function removeTree(target: string): void {
    for (const [path, data] of [...files.entries()]) {
      if (within(path, target)) {
        usedBytes -= data.length;
        files.delete(path);
      }
    }
    for (const path of [...directories]) {
      if (path !== '' && within(path, target)) {
        directories.delete(path);
      }
    }
  }

  function children(directory: string): FileEntry[] {
    const prefix = directory === '' ? '' : `${directory}/`;
    const direct = (path: string): string | undefined =>
      path.startsWith(prefix) && path !== directory && !path.slice(prefix.length).includes('/')
        ? path.slice(prefix.length)
        : undefined;
    const entries: FileEntry[] = [];
    for (const path of directories) {
      const name = direct(path);
      if (name !== undefined && name !== '') {
        entries.push({ name, kind: 'directory', bytes: 0 });
      }
    }
    for (const [path, data] of files) {
      const name = direct(path);
      if (name !== undefined) {
        entries.push({ name, kind: 'file', bytes: data.length });
      }
    }
    return entries.sort((left, right) => left.name.localeCompare(right.name));
  }

  function sizeOf(target: string): number {
    const file = files.get(target);
    if (file !== undefined) {
      return file.length;
    }
    requireDirectory(target);
    let total = 0;
    for (const [path, data] of files) {
      if (within(path, target)) {
        total += data.length;
      }
    }
    return total;
  }

  function subscribe<T>(listeners: Set<T>, listener: T): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }

  return {
    readBytes: async (path) => read('bytes', path),
    readText: async (path) => new TextDecoder().decode(read('text', path)),
    readRange: async (path, offset, length) => {
      if (!Number.isSafeInteger(offset) || !Number.isSafeInteger(length) || offset < 0 || length < 0) {
        throw portError('files.io', `${offset}+${length} is not a range of ${path}`);
      }
      const data = rangeOf(stored(path), offset, length);
      for (const listener of readListeners) {
        listener('range', normalize(path), data.byteLength);
      }
      return data;
    },
    writeBytes: async (path, data) => write('write', path, data),
    appendBytes: async (path, data) => {
      const target = normalize(path);
      const current = files.get(target);
      if (current === undefined) {
        write('append', target, data);
        return;
      }
      writable('append', target, data.byteLength);
      reserve(data.byteLength, data.byteLength);
      current.parts.push(data.slice());
      current.length += data.byteLength;
    },
    writeText: async (path, text) => write('write', path, new TextEncoder().encode(text)),
    list: async (path) => {
      const target = normalize(path);
      requireDirectory(target);
      return children(target);
    },
    exists: async (path) => {
      const target = normalize(path);
      return files.has(target) || directories.has(target);
    },
    size: async (path) => sizeOf(normalize(path)),
    mkdir: async (path) => {
      const target = normalize(path);
      guardWrite('mkdir', target);
      if (files.has(target)) {
        throw portError('files.io', `${path} is a file`);
      }
      const parts = target.split('/');
      parts.forEach((_, index) => directories.add(parts.slice(0, index + 1).join('/')));
    },
    rename: async (from, to) => {
      const source = normalize(from);
      const target = normalize(to);
      guardWrite('rename', target);
      if (!files.has(source) && !directories.has(source)) {
        throw portError('files.not-found', `${from} does not exist`);
      }
      if (source === '' || target === '' || within(target, source)) {
        throw portError('files.io', `${from} cannot move to ${to}`);
      }
      requireDirectory(parentOf(target));
      if (files.has(target) || directories.has(target)) {
        throw portError('files.io', `${to} already exists; a rename never replaces`);
      }
      guardRename(target);
      const file = files.get(source);
      if (file !== undefined) {
        files.set(target, file);
        files.delete(source);
        return;
      }
      const moved = (path: string): string => `${target}${path.slice(source.length)}`;
      const movedFiles = [...files.entries()].filter(([path]) => within(path, source));
      const movedDirectories = [...directories].filter((path) => within(path, source));
      for (const [path] of movedFiles) {
        files.delete(path);
      }
      for (const path of movedDirectories) {
        directories.delete(path);
      }
      movedDirectories.forEach((path) => directories.add(moved(path)));
      movedFiles.forEach(([path, data]) => files.set(moved(path), data));
    },
    remove: async (path) => {
      const target = normalize(path);
      guardWrite('remove', target);
      if (target === '') {
        throw portError('files.io', 'the device root cannot be removed');
      }
      removeTree(target);
    },
    adopt: async (uri, path) => {
      const data = external.get(uri);
      if (data === undefined) {
        throw portError('files.not-found', `${uri} was not handed to the app`);
      }
      write('adopt', path, data);
      return data.byteLength;
    },
    freeSpace: async () => Math.max(0, capacity - usedBytes),
    uriOf: (path) => {
      try {
        const target = normalize(path);
        return files.has(target) ? `${memoryUriScheme}${target}` : undefined;
      } catch {
        return undefined;
      }
    },
    externalBytes: (uri) => external.get(uri)?.byteLength,
    offerExternal: (uri, data) => {
      external.set(uri, data.slice());
    },
    setCapacity: (bytes) => {
      capacity = bytes;
    },
    failWrites: (fail) => {
      failing = fail;
    },
    failRename: (targetPrefix, times = 1) => {
      renameFailures.push({ prefix: normalize(targetPrefix), remaining: times });
    },
    onWrite: (listener) => subscribe(writeListeners, listener),
    onRead: (listener) => subscribe(readListeners, listener),
    used: () => usedBytes,
    tree: () =>
      [...[...directories].filter((path) => path !== '').map((path) => `${path}/`), ...files.keys()].sort(),
  };
}
