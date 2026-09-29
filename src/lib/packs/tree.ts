import { fromUtf8, metadataPath, type BurritoFiles } from '../burrito/files';
import { isRecord } from '../burrito/metadata';
import type { Files } from '../ports';

export function parentOf(path: string): string {
  const index = path.lastIndexOf('/');
  return index === -1 ? '' : path.slice(0, index);
}

export async function removeIfPresent(files: Files, path: string): Promise<void> {
  if (await files.exists(path)) {
    await files.remove(path);
  }
}

export async function writeBurrito(files: Files, root: string, burrito: BurritoFiles): Promise<void> {
  for (const [path, bytes] of burrito) {
    const target = `${root}/${path}`;
    await files.mkdir(parentOf(target));
    await files.writeBytes(target, bytes);
  }
}

function listedPaths(metadata: Uint8Array): readonly string[] {
  try {
    const parsed: unknown = JSON.parse(fromUtf8(metadata));
    return isRecord(parsed) && isRecord(parsed.ingredients) ? Object.keys(parsed.ingredients) : [];
  } catch {
    return [];
  }
}

export async function readBurrito(files: Files, root: string): Promise<BurritoFiles> {
  const burrito = new Map<string, Uint8Array>();
  const metadataFile = `${root}/${metadataPath}`;
  if (!(await files.exists(metadataFile))) {
    return burrito;
  }
  const metadata = await files.readBytes(metadataFile);
  burrito.set(metadataPath, metadata);
  for (const path of listedPaths(metadata)) {
    const file = `${root}/${path}`;
    if (await files.exists(file)) {
      burrito.set(path, await files.readBytes(file));
    }
  }
  return burrito;
}

export async function copyBurrito(files: Files, from: string, to: string): Promise<void> {
  await writeBurrito(files, to, await readBurrito(files, from));
}

export function bytesOf(burrito: BurritoFiles): number {
  let total = 0;
  for (const bytes of burrito.values()) {
    total += bytes.byteLength;
  }
  return total;
}
