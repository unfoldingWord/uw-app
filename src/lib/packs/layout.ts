import { packDirectory, packsDirectory, type PackId } from '../domain/pack';
import type { Files } from '../ports';
import { parentOf, removeIfPresent } from './tree';

export const stagingDirectory = `${packsDirectory}/.staging`;

export const inboxDirectory = `${packsDirectory}/.inbox`;

const legacyAsideDirectory = `${packsDirectory}/.old`;

export function stagingPath(install: string): string {
  return `${stagingDirectory}/${install}`;
}

export function installDirectory(pack: PackId, install: string): string {
  return `${packDirectory(pack)}/${install}`;
}

export function burritoRoot(pack: PackId, install: string, publisher: string, resource: string): string {
  return `${installDirectory(pack, install)}/${publisher}/${resource}`;
}

export async function pruneEmpty(files: Files, directory: string): Promise<void> {
  let path = directory;
  while (path.startsWith(`${packsDirectory}/`) && (await files.exists(path))) {
    if ((await files.list(path)).length > 0) {
      return;
    }
    await files.remove(path);
    path = parentOf(path);
  }
}

function ancestorsOf(roots: readonly string[]): Set<string> {
  const found = new Set<string>();
  for (const root of roots) {
    const parts = root.split('/');
    for (let length = 1; length < parts.length; length += 1) {
      found.add(parts.slice(0, length).join('/'));
    }
  }
  return found;
}

export async function collectGarbage(files: Files, under: string, roots: readonly string[]): Promise<void> {
  const kept = new Set(roots);
  const ancestors = ancestorsOf(roots);
  const walk = async (directory: string): Promise<void> => {
    for (const entry of await files.list(directory)) {
      const path = `${directory}/${entry.name}`;
      if (kept.has(path)) {
        continue;
      }
      if (entry.kind === 'directory' && ancestors.has(path)) {
        await walk(path);
        continue;
      }
      await files.remove(path);
    }
  };
  if (!(await files.exists(under))) {
    return;
  }
  if (kept.has(under)) {
    return;
  }
  if (!ancestors.has(under) && under !== packsDirectory) {
    await files.remove(under);
    return;
  }
  await walk(under);
}

export async function recoverPacks(files: Files, roots: readonly string[] | undefined): Promise<void> {
  if (roots === undefined) {
    await removeIfPresent(files, stagingDirectory);
    await removeIfPresent(files, inboxDirectory);
    await removeIfPresent(files, legacyAsideDirectory);
    return;
  }
  await collectGarbage(files, packsDirectory, roots);
}
