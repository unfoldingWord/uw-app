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
