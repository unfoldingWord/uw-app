import type { FileEntry, Files } from '@lib/ports';
import { portError } from './errors';

export type MemoryFiles = Files & {
  setCapacity(bytes: number): void;
  failWrites(fail: boolean): void;
  failRename(targetPrefix: string, times?: number): void;
  offerExternal(external: string, data: Uint8Array): void;
  tree(): readonly string[];
};

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

export function createMemoryFiles(options: { capacity?: number } = {}): MemoryFiles {
  const files = new Map<string, Uint8Array>();
  const external = new Map<string, Uint8Array>();
  const directories = new Set<string>(['']);
  let capacity = options.capacity ?? defaultCapacity;
  let failing = false;
  const renameFailures: { prefix: string; remaining: number }[] = [];

  function guardRename(target: string): void {
    const failure = renameFailures.find((item) => item.remaining > 0 && within(target, item.prefix));
    if (failure !== undefined) {
      failure.remaining -= 1;
      throw portError('files.io', `rename onto ${target} refused`);
    }
  }

  const used = (): number => [...files.values()].reduce((sum, data) => sum + data.byteLength, 0);

  function guardWrite(path: string): void {
    if (failing) {
      throw portError('files.io', `write to ${path} refused`);
    }
  }

  function requireDirectory(path: string): void {
    if (!directories.has(path)) {
      throw portError('files.not-found', `${path || '/'} is not a directory`);
    }
  }

  function read(path: string): Uint8Array {
    const data = files.get(normalize(path));
    if (data === undefined) {
      throw portError('files.not-found', `${path} does not exist`);
    }
    return data.slice();
  }

  function write(path: string, data: Uint8Array): void {
    const target = normalize(path);
    guardWrite(target);
    if (target === '' || directories.has(target)) {
      throw portError('files.io', `${path} is a directory`);
    }
    requireDirectory(parentOf(target));
    const growth = data.byteLength - (files.get(target)?.byteLength ?? 0);
    if (used() + growth > capacity) {
      throw portError('files.no-space', `${data.byteLength} bytes do not fit`);
    }
    files.set(target, data.slice());
  }

  function removeTree(target: string): void {
    for (const path of [...files.keys()]) {
      if (within(path, target)) {
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
        entries.push({ name, kind: 'directory', bytes: sizeOf(path) });
      }
    }
    for (const [path, data] of files) {
      const name = direct(path);
      if (name !== undefined) {
        entries.push({ name, kind: 'file', bytes: data.byteLength });
      }
    }
    return entries.sort((left, right) => left.name.localeCompare(right.name));
  }

  function sizeOf(target: string): number {
    const file = files.get(target);
    if (file !== undefined) {
      return file.byteLength;
    }
    requireDirectory(target);
    return [...files.entries()]
      .filter(([path]) => within(path, target))
      .reduce((sum, [, data]) => sum + data.byteLength, 0);
  }

  return {
    readBytes: async (path) => read(path),
    readText: async (path) => new TextDecoder().decode(read(path)),
    readRange: async (path, offset, length) => {
      if (!Number.isSafeInteger(offset) || !Number.isSafeInteger(length) || offset < 0 || length < 0) {
        throw portError('files.io', `${offset}+${length} is not a range of ${path}`);
      }
      return read(path).slice(offset, offset + length);
    },
    writeBytes: async (path, data) => write(path, data),
    appendBytes: async (path, data) => {
      const target = normalize(path);
      const current = files.get(target);
      if (current === undefined) {
        write(target, data);
        return;
      }
      const joined = new Uint8Array(current.byteLength + data.byteLength);
      joined.set(current);
      joined.set(data, current.byteLength);
      write(target, joined);
    },
    writeText: async (path, text) => write(path, new TextEncoder().encode(text)),
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
      guardWrite(target);
      if (files.has(target)) {
        throw portError('files.io', `${path} is a file`);
      }
      const parts = target.split('/');
      parts.forEach((_, index) => directories.add(parts.slice(0, index + 1).join('/')));
    },
    rename: async (from, to) => {
      const source = normalize(from);
      const target = normalize(to);
      guardWrite(target);
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
      if (files.has(source)) {
        files.set(target, files.get(source) ?? new Uint8Array());
        files.delete(source);
        return;
      }
      const moved = (path: string): string => `${target}${path.slice(source.length)}`;
      const movedFiles = [...files.entries()].filter(([path]) => within(path, source));
      const movedDirectories = [...directories].filter((path) => within(path, source));
      removeTree(source);
      movedDirectories.forEach((path) => directories.add(moved(path)));
      movedFiles.forEach(([path, data]) => files.set(moved(path), data));
    },
    remove: async (path) => {
      const target = normalize(path);
      guardWrite(target);
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
      write(path, data);
      return data.byteLength;
    },
    freeSpace: async () => Math.max(0, capacity - used()),
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
    tree: () =>
      [...[...directories].filter((path) => path !== '').map((path) => `${path}/`), ...files.keys()].sort(),
  };
}
