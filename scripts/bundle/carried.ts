import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseLock, type BundledLock } from '../bundled/lock';

export type StandIns = { readonly placed: readonly string[]; remove(): void };

function standInBytes(file: string): Uint8Array {
  return new TextEncoder().encode(`a stand-in for ${file}, a carried archive, used only by npm run bundle`);
}

export function readCarriedLock(path: string): BundledLock | string {
  if (!existsSync(path)) {
    return 'content/bundled.lock.json is missing, so a build would ship no content';
  }
  const read = parseLock(readFileSync(path, 'utf8'));
  return read.ok ? read.lock : read.reason;
}

export function placeStandIns(lock: BundledLock, directory: string): StandIns {
  const created = !existsSync(directory);
  mkdirSync(directory, { recursive: true });
  const placed = lock.archives
    .map((archive) => archive.file)
    .filter((file) => !existsSync(join(directory, file)));
  for (const file of placed) {
    writeFileSync(join(directory, file), standInBytes(file));
  }
  return {
    placed,
    remove() {
      for (const file of placed) {
        rmSync(join(directory, file), { force: true });
      }
      if (created && readdirSync(directory).length === 0) {
        rmSync(directory, { recursive: true, force: true });
      }
    },
  };
}

type ExportMetadata = { fileMetadata?: Record<string, { assets?: { ext?: unknown }[] } | undefined> };

export function carriedAssetCount(metadata: unknown, platform: string): number {
  const assets = (metadata as ExportMetadata | undefined)?.fileMetadata?.[platform]?.assets ?? [];
  return assets.filter((asset) => asset.ext === 'zip').length;
}
