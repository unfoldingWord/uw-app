import { packDirectory, packKinds, packsDirectory, type PackId } from '../domain/pack';
import type { Files } from '../ports';
import { parentOf, removeIfPresent } from './tree';

export const stagingDirectory = `${packsDirectory}/.staging`;

export const asideDirectory = `${packsDirectory}/.old`;

export function stagingPath(install: string): string {
  return `${stagingDirectory}/${install}`;
}

export function asidePath(pack: PackId): string {
  return [asideDirectory, ...pack.split(':')].join('/');
}

export async function swapIn(files: Files, staging: string, pack: PackId): Promise<void> {
  const target = packDirectory(pack);
  const aside = asidePath(pack);
  await removeIfPresent(files, aside);
  const replacing = await files.exists(target);
  if (replacing) {
    await files.mkdir(parentOf(aside));
    await files.rename(target, aside);
  }
  try {
    await files.mkdir(parentOf(target));
    await files.rename(staging, target);
  } catch (error) {
    if (replacing && !(await files.exists(target))) {
      await files.rename(aside, target);
    }
    await clearAside(files);
    throw error;
  }
  await clearAside(files);
}

async function clearAside(files: Files): Promise<void> {
  try {
    await removeIfPresent(files, asideDirectory);
  } catch {
    return;
  }
}

async function directoriesIn(files: Files, path: string): Promise<readonly string[]> {
  if (!(await files.exists(path))) {
    return [];
  }
  return (await files.list(path)).filter((entry) => entry.kind === 'directory').map((entry) => entry.name);
}

async function packsOnDisk(files: Files): Promise<PackId[]> {
  const found: PackId[] = [];
  for (const kind of packKinds) {
    for (const first of await directoriesIn(files, `${packsDirectory}/${kind}`)) {
      if (kind !== 'audio') {
        found.push(`${kind}:${first}`);
        continue;
      }
      for (const second of await directoriesIn(files, `${packsDirectory}/${kind}/${first}`)) {
        found.push(`${kind}:${first}:${second}`);
      }
    }
  }
  return found;
}

export async function recoverPacks(files: Files, known: readonly PackId[] | undefined): Promise<void> {
  for (const pack of known ?? []) {
    const target = packDirectory(pack);
    const aside = asidePath(pack);
    if (!(await files.exists(target)) && (await files.exists(aside))) {
      await files.mkdir(parentOf(target));
      await files.rename(aside, target);
    }
  }
  await removeIfPresent(files, asideDirectory);
  await removeIfPresent(files, stagingDirectory);
  if (known === undefined) {
    return;
  }
  for (const pack of await packsOnDisk(files)) {
    if (!known.includes(pack)) {
      await files.remove(packDirectory(pack));
    }
  }
}
