import { fromUtf8, metadataPath } from '../burrito/files';
import { isRecord } from '../burrito/metadata';
import type { Files } from '../ports';
import type { InstalledBurrito } from './types';

const wordsPayload = 'ingredients/payload/';

const wordsResource = /_tw$/i;

type Listed = ReadonlyMap<string, { size: number; md5: string }>;

export function isWordsBurrito(burrito: InstalledBurrito): boolean {
  return burrito.row === 'articles' && wordsResource.test(burrito.provenance.resource);
}

async function listedOf(files: Files, root: string): Promise<Listed> {
  const path = `${root}/${metadataPath}`;
  if (!(await files.exists(path))) {
    return new Map();
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(fromUtf8(await files.readBytes(path)));
  } catch {
    return new Map();
  }
  const ingredients = isRecord(parsed) && isRecord(parsed.ingredients) ? parsed.ingredients : {};
  const listed = new Map<string, { size: number; md5: string }>();
  for (const [key, entry] of Object.entries(ingredients)) {
    const checksum = isRecord(entry) && isRecord(entry.checksum) ? entry.checksum.md5 : undefined;
    const size = isRecord(entry) ? entry.size : undefined;
    if (typeof checksum === 'string' && typeof size === 'number') {
      listed.set(key, { size, md5: checksum });
    }
  }
  return listed;
}

function sameFact(left: { size: number; md5: string } | undefined, right: { size: number; md5: string }) {
  return left !== undefined && left.size === right.size && left.md5 === right.md5;
}

export async function measuredBytes(files: Files, root: string): Promise<number> {
  let total = 0;
  for (const key of [metadataPath, ...(await listedOf(files, root)).keys()]) {
    const path = `${root}/${key}`;
    if (await files.exists(path)) {
      total += await files.size(path);
    }
  }
  return total;
}

export async function shareWordsPayload(
  files: Files,
  root: string,
  wordsRoots: readonly string[],
): Promise<void> {
  const listed = await listedOf(files, root);
  const words = await Promise.all(
    wordsRoots.map(async (words) => ({ words, listed: await listedOf(files, words) })),
  );
  for (const [key, fact] of listed) {
    if (!key.startsWith(wordsPayload)) {
      continue;
    }
    const holder = words.find((item) => sameFact(item.listed.get(key), fact));
    const path = `${root}/${key}`;
    if (
      holder !== undefined &&
      (await files.exists(`${holder.words}/${key}`)) &&
      (await files.exists(path))
    ) {
      await files.remove(path);
    }
  }
}

async function burritoRootsUnder(files: Files, directory: string, depth: number): Promise<string[]> {
  if (!(await files.exists(directory))) {
    return [];
  }
  if (depth === 0) {
    return (await files.exists(`${directory}/${metadataPath}`)) ? [directory] : [];
  }
  const found: string[] = [];
  for (const entry of await files.list(directory)) {
    if (entry.kind === 'directory') {
      found.push(...(await burritoRootsUnder(files, `${directory}/${entry.name}`, depth - 1)));
    }
  }
  return found;
}

const packDepth = 3;

const rootDepth = 3;

export type SharedLookup = (key: string) => Promise<Uint8Array | undefined>;

export async function sharedLookup(files: Files, root: string): Promise<SharedLookup> {
  const own = await listedOf(files, root);
  const pack = root.split('/').slice(0, packDepth).join('/');
  const others = await Promise.all(
    (await burritoRootsUnder(files, pack, rootDepth))
      .filter((other) => other !== root)
      .map(async (other) => ({ other, listed: await listedOf(files, other) })),
  );
  return async (key) => {
    const fact = own.get(key);
    if (fact === undefined || !key.startsWith(wordsPayload)) {
      return undefined;
    }
    for (const { other, listed } of others) {
      const path = `${other}/${key}`;
      if (sameFact(listed.get(key), fact) && (await files.exists(path))) {
        return files.readBytes(path);
      }
    }
    return undefined;
  };
}

export async function restoreSharedPayload(files: Files, root: string): Promise<void> {
  const lookup = await sharedLookup(files, root);
  for (const key of (await listedOf(files, root)).keys()) {
    const path = `${root}/${key}`;
    if (key.startsWith(wordsPayload) && !(await files.exists(path))) {
      const bytes = await lookup(key);
      if (bytes !== undefined) {
        await files.writeBytes(path, bytes);
      }
    }
  }
}
