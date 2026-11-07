import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { readArchive } from '@lib/burrito/archive';
import { validate } from '@lib/burrito/validate';
import { packRows } from '@lib/packs/burrito';
import type { BundledArchive } from '@lib/ports';
import { builtImageArchive } from '@sim/bundled';
import { createWorld } from '@sim/world';
import { sha256Of, type BundledLock, type LockedArchive } from './lock';
import { allowlisted, serveImageSources, type ReadUrl } from './sources';

export type FetchReport = { written: string[]; kept: string[]; removed: string[]; bytes: number };

export class BundledUnverified extends Error {}

function carriedOf(archive: LockedArchive): BundledArchive {
  return {
    file: archive.file,
    pack: archive.pack,
    row: archive.row,
    publisher: archive.publisher,
    resource: archive.resource,
    language: archive.language,
    tag: archive.tag,
    commit: archive.commit,
    title: archive.title,
    subject: archive.subject,
    published: archive.published,
    bytes: archive.bytes,
  };
}

function verified(archive: LockedArchive, bytes: Uint8Array): Uint8Array {
  if (bytes.byteLength !== archive.bytes) {
    throw new BundledUnverified(
      `${archive.file} is ${bytes.byteLength} bytes, and the lock pins ${archive.bytes}; run npm run bundled:lock if the release changed`,
    );
  }
  if (sha256Of(bytes) !== archive.sha256) {
    throw new BundledUnverified(`${archive.file} does not match the sha256 the lock pins`);
  }
  const read = readArchive(bytes);
  if (!read.ok) {
    throw new BundledUnverified(`${archive.file} is not a readable archive: ${read.rule} at ${read.path}`);
  }
  const report = validate(read.files, { rows: packRows });
  if (!report.ok) {
    throw new BundledUnverified(
      `${archive.file} fails the content contract: ${report.kind} ${report.rule} at ${report.path}`,
    );
  }
  if (report.row.id !== archive.row) {
    throw new BundledUnverified(
      `${archive.file} validates as ${report.row.id}, and the lock says ${archive.row}`,
    );
  }
  return bytes;
}

async function builtImages(archive: LockedArchive, read: ReadUrl): Promise<Uint8Array> {
  const world = createWorld();
  await serveImageSources(world, read, archive.url);
  const device = world.device('image-builder');
  await device.start();
  return builtImageArchive(device, { ...carriedOf(archive), row: 'images' });
}

async function placedOffline(lock: BundledLock, carried: ReadonlyMap<string, Uint8Array>): Promise<void> {
  const world = createWorld();
  const device = world.device('carrier', {
    bundled: { archives: lock.archives.map(carriedOf), bytes: carried },
  });
  await device.start();
  device.adapters.http.setOnline(false);
  const outcomes = await device.kernel.packs.placeBundled();
  const failed = outcomes.flatMap((outcome) => (outcome.ok ? [] : [`${outcome.pack ?? ''} ${outcome.code}`]));
  const partial = device.kernel.journal
    .read()
    .flatMap((entry) =>
      entry.type === 'PackResourceFailed' ? [`${entry.payload.resource} ${entry.payload.code}`] : [],
    );
  if (failed.length > 0 || partial.length > 0) {
    throw new BundledUnverified(
      `the carried packs do not install offline: ${[...failed, ...partial].join(', ')}`,
    );
  }
  if (lock.archives.some((archive) => archive.row === 'images')) {
    const story = await device.kernel.corpus.story(1, lock.language);
    if (!story?.frames.some((frame) => frame.image !== undefined)) {
      throw new BundledUnverified(`story 1 in ${lock.language} shows no picture from the carried Image Pack`);
    }
  }
}

function onDisk(path: string, archive: LockedArchive): boolean {
  return existsSync(path) && sha256Of(readFileSync(path)) === archive.sha256;
}

export async function fetchBundled(
  lock: BundledLock,
  read: ReadUrl,
  directory: string,
): Promise<FetchReport> {
  const guarded = allowlisted(read);
  const report: FetchReport = { written: [], kept: [], removed: [], bytes: 0 };
  mkdirSync(directory, { recursive: true });
  const carried = new Map<string, Uint8Array>();
  for (const archive of lock.archives) {
    const path = join(directory, archive.file);
    if (onDisk(path, archive)) {
      carried.set(archive.file, verified(archive, readFileSync(path)));
      report.kept.push(archive.file);
    } else {
      const fetched =
        archive.built === 'images' ? await builtImages(archive, guarded) : await guarded(archive.url);
      const bytes = verified(archive, fetched);
      const partial = `${path}.partial`;
      writeFileSync(partial, bytes);
      renameSync(partial, path);
      carried.set(archive.file, bytes);
      report.written.push(archive.file);
    }
    report.bytes += archive.bytes;
  }
  await placedOffline(lock, carried);
  const locked = new Set(lock.archives.map((archive) => archive.file));
  for (const name of readdirSync(directory)) {
    if (!locked.has(name)) {
      rmSync(join(directory, name), { recursive: true, force: true });
      report.removed.push(name);
    }
  }
  return report;
}
