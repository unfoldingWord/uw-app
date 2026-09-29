import { Directory, File, FileMode, Paths } from 'expo-file-system';
import type { FileEntry, Files } from '@lib/ports';
import { isPortError, messageOf, portError } from './errors';

export type DeviceRoot = { directory: Directory; uriOf(path: string): string };

const deviceDirectoryName = 'device';
const noSpace = /no space|enospc|disk full|not enough space|out of space/i;

export function normalize(path: string): string {
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

export function createDeviceRoot(): DeviceRoot {
  const directory = new Directory(Paths.document, deviceDirectoryName);
  directory.create({ intermediates: true, idempotent: true });
  return {
    directory,
    uriOf: (path) => {
      const target = normalize(path);
      return target === '' ? directory.uri : new File(directory, target).uri;
    },
  };
}

function ioError(error: unknown, detail: string): Error {
  if (isPortError(error)) {
    return error;
  }
  const message = messageOf(error);
  return portError(noSpace.test(message) ? 'files.no-space' : 'files.io', `${detail}: ${message}`);
}

async function guarded<T>(detail: string, work: () => T | Promise<T>): Promise<T> {
  try {
    return await work();
  } catch (error) {
    throw ioError(error, detail);
  }
}

function sizeOfDirectory(directory: Directory): number {
  return directory
    .list()
    .reduce((sum, entry) => sum + (entry instanceof File ? entry.size : sizeOfDirectory(entry)), 0);
}

export function createPlatformFiles(root: DeviceRoot): Files {
  const fileAt = (path: string): File => new File(root.directory, path);
  const directoryAt = (path: string): Directory =>
    path === '' ? root.directory : new Directory(root.directory, path);
  const isFile = (path: string): boolean => path !== '' && fileAt(path).exists;
  const isDirectory = (path: string): boolean => path === '' || directoryAt(path).exists;

  function requireFile(path: string, shown: string): File {
    const target = normalize(path);
    if (!isFile(target)) {
      throw portError('files.not-found', `${shown} does not exist`);
    }
    return fileAt(target);
  }

  function requireDirectory(path: string): Directory {
    if (!isDirectory(path)) {
      throw portError('files.not-found', `${path || '/'} is not a directory`);
    }
    return directoryAt(path);
  }

  function writableTarget(path: string): string {
    const target = normalize(path);
    if (target === '' || isDirectory(target)) {
      throw portError('files.io', `${path} is a directory`);
    }
    requireDirectory(parentOf(target));
    return target;
  }

  function writable(path: string): File {
    const file = fileAt(writableTarget(path));
    if (!file.exists) {
      file.create();
    }
    return file;
  }

  async function write(path: string, data: Uint8Array | string): Promise<void> {
    await guarded(`write to ${path}`, () => writable(path).write(data));
  }

  function entryOf(entry: File | Directory): FileEntry {
    return entry instanceof File
      ? { name: entry.name, kind: 'file', bytes: entry.size }
      : { name: entry.name, kind: 'directory', bytes: 0 };
  }

  return {
    readBytes: (path) => guarded(`read ${path}`, () => requireFile(path, path).bytes()),
    readText: (path) => guarded(`read ${path}`, () => requireFile(path, path).text()),
    readRange: (path, offset, length) =>
      guarded(`read ${path}`, () => {
        if (!Number.isSafeInteger(offset) || !Number.isSafeInteger(length) || offset < 0 || length < 0) {
          throw portError('files.io', `${offset}+${length} is not a range of ${path}`);
        }
        const file = requireFile(path, path);
        const available = Math.max(0, Math.min(length, file.size - offset));
        if (available === 0) {
          return new Uint8Array();
        }
        const handle = file.open(FileMode.ReadOnly);
        try {
          handle.offset = offset;
          return handle.readBytes(available);
        } finally {
          handle.close();
        }
      }),
    writeBytes: (path, data) => write(path, data),
    appendBytes: (path, data) =>
      guarded(`append to ${path}`, () => {
        const target = normalize(path);
        if (!isFile(target)) {
          writable(target).write(data);
          return;
        }
        fileAt(target).write(data, { append: true });
      }),
    writeText: (path, text) => write(path, text),
    list: (path) =>
      guarded(`list ${path}`, () =>
        requireDirectory(normalize(path))
          .list()
          .map(entryOf)
          .sort((left, right) => left.name.localeCompare(right.name)),
      ),
    exists: (path) =>
      guarded(`look up ${path}`, () => {
        const target = normalize(path);
        return isFile(target) || isDirectory(target);
      }),
    size: (path) =>
      guarded(`size ${path}`, () => {
        const target = normalize(path);
        return isFile(target) ? fileAt(target).size : sizeOfDirectory(requireDirectory(target));
      }),
    mkdir: (path) =>
      guarded(`make ${path}`, () => {
        const target = normalize(path);
        if (isFile(target)) {
          throw portError('files.io', `${path} is a file`);
        }
        if (target !== '') {
          directoryAt(target).create({ intermediates: true, idempotent: true });
        }
      }),
    rename: (from, to) =>
      guarded(`rename ${from}`, async () => {
        const source = normalize(from);
        const target = normalize(to);
        const sourceIsFile = isFile(source);
        if (!sourceIsFile && (source === '' || !isDirectory(source))) {
          throw portError(source === '' ? 'files.io' : 'files.not-found', `${from} does not exist`);
        }
        if (target === '' || within(target, source)) {
          throw portError('files.io', `${from} cannot move to ${to}`);
        }
        requireDirectory(parentOf(target));
        if (isFile(target) || isDirectory(target)) {
          throw portError('files.io', `${to} already exists; a rename never replaces`);
        }
        if (sourceIsFile) {
          await fileAt(source).move(fileAt(target));
          return;
        }
        await directoryAt(source).move(directoryAt(target));
      }),
    remove: (path) =>
      guarded(`remove ${path}`, () => {
        const target = normalize(path);
        if (target === '') {
          throw portError('files.io', 'the device root cannot be removed');
        }
        if (isFile(target)) {
          fileAt(target).delete();
        } else if (isDirectory(target)) {
          directoryAt(target).delete();
        }
      }),
    adopt: (external, path) =>
      guarded(`adopt into ${path}`, async () => {
        const source = new File(external);
        if (!source.exists) {
          throw portError('files.not-found', `${external} was not handed to the app`);
        }
        const target = writableTarget(path);
        if (isFile(target)) {
          fileAt(target).delete();
        }
        await source.copy(fileAt(target));
        return fileAt(target).size;
      }),
    freeSpace: async () => Paths.availableDiskSpace,
    uriOf: (path) => {
      try {
        const target = normalize(path);
        return isFile(target) ? fileAt(target).uri : undefined;
      } catch {
        return undefined;
      }
    },
  };
}
