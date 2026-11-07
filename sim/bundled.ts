import { writeArchive } from '@lib/burrito/archive';
import type { CatalogRelease } from '@lib/catalog/types';
import { imagePackId, languagePackId, type PackId } from '@lib/domain/pack';
import { picturesFollow } from '@lib/packs/types';
import { fromCatalog, type CatalogChoice } from '@lib/packs/source';
import type { BundledArchive, Files } from '@lib/ports';
import type { BundledContent } from './adapters/bundled';
import type { SimDevice } from './device';
import { createWorld, type World } from './world';

const bundledArchiveMtime = new Date(2026, 0, 1, 0, 0, 0);

const bundledImagesFile = 'obs_images.zip';

const imagesRoot = 'obs_images';

export type BuiltBundle = BundledContent & { readonly urls: ReadonlyMap<string, string> };

export type BundleOptions = {
  readonly device?: string;
  prepare?(release: CatalogRelease): Promise<void>;
};

class BundleUnavailable extends Error {}

function bundledFileOf(resource: string): string {
  return `${resource.toLowerCase().replace(/[^a-z0-9]+/g, '_')}.zip`;
}

function archiveOf(release: CatalogRelease, pack: PackId, file: string, bytes: number): BundledArchive {
  if (release.row === undefined) {
    throw new BundleUnavailable(`${release.publisher}/${release.resource} has no resource row`);
  }
  return {
    file,
    pack,
    row: release.row,
    publisher: release.publisher,
    resource: release.resource,
    language: release.language,
    tag: release.tag,
    commit: release.commit,
    title: release.title,
    subject: release.subject,
    published: release.published,
    bytes,
  };
}

async function treeOf(files: Files, root: string, prefix = ''): Promise<Map<string, Uint8Array>> {
  const found = new Map<string, Uint8Array>();
  for (const entry of await files.list(prefix === '' ? root : `${root}/${prefix}`)) {
    const path = prefix === '' ? entry.name : `${prefix}/${entry.name}`;
    if (entry.kind === 'directory') {
      for (const [key, value] of await treeOf(files, root, path)) {
        found.set(key, value);
      }
    } else {
      found.set(path, await files.readBytes(`${root}/${path}`));
    }
  }
  return found;
}

export async function builtImageArchive(device: SimDevice, choice: CatalogChoice): Promise<Uint8Array> {
  const outcome = await device.kernel.packs.install(fromCatalog([{ ...choice, built: 'images' }]), {
    pack: imagePackId,
  });
  if (!outcome.ok) {
    throw new BundleUnavailable(`the Image Pack does not build: ${outcome.code}`);
  }
  const burrito = outcome.pack.burritos[0];
  if (burrito === undefined) {
    throw new BundleUnavailable('the Image Pack built with no burrito');
  }
  return writeArchive(await treeOf(device.adapters.files, burrito.root), {
    root: imagesRoot,
    mtime: bundledArchiveMtime,
  });
}

export async function buildBundle(
  world: World,
  language: string,
  options: BundleOptions = {},
): Promise<BuiltBundle> {
  const device = world.device(options.device ?? 'bundler');
  await device.start();
  const { kernel } = device;
  const refreshed = await kernel.catalog.refresh();
  if (!refreshed.ok) {
    throw new BundleUnavailable(`the catalog did not refresh: ${refreshed.code}`);
  }
  const pack = languagePackId(language);
  const texts = await kernel.packs.defaults(pack);
  if (texts.length === 0) {
    throw new BundleUnavailable(`the catalog has no default releases for ${language}`);
  }
  for (const release of texts) {
    await options.prepare?.(release);
  }
  const outcome = await kernel.packs.installFromCatalog(pack);
  const status = await kernel.packs.status(language);
  if (!outcome.ok || !status.complete || status.failed.length > 0) {
    const failed = status.failed.map((item) => `${item.resource} ${item.code}`).join(', ');
    const code = outcome.ok ? 'partial' : outcome.code;
    throw new BundleUnavailable(`the ${language} pack did not install whole (${code}): ${failed}`);
  }
  const archives: BundledArchive[] = [];
  const bytes = new Map<string, Uint8Array>();
  const urls = new Map<string, string>();
  for (const release of texts) {
    const route = world.network.lookup(release.archiveUrl);
    if (route === undefined || !(route.body instanceof Uint8Array)) {
      throw new BundleUnavailable(`${release.archiveUrl} was not served`);
    }
    const file = bundledFileOf(release.resource);
    if (bytes.has(file) || file === bundledImagesFile) {
      throw new BundleUnavailable(`two releases share the file name ${file}`);
    }
    archives.push(archiveOf(release, pack, file, route.body.byteLength));
    bytes.set(file, route.body.slice());
    urls.set(file, release.archiveUrl);
  }
  const withPictures = picturesFollow(kernel.catalog.all(), [], language);
  const [images] = withPictures ? await kernel.packs.defaults(imagePackId) : [];
  if (images !== undefined) {
    await options.prepare?.(images);
    const archive = await builtImageArchive(device, images);
    archives.push(archiveOf(images, imagePackId, bundledImagesFile, archive.byteLength));
    bytes.set(bundledImagesFile, archive);
    urls.set(bundledImagesFile, images.archiveUrl);
  }
  return { archives, bytes, urls };
}

const fixtureBundles = new Map<string, Promise<BuiltBundle>>();

export function fixtureBundle(language: string): Promise<BuiltBundle> {
  const known = fixtureBundles.get(language);
  if (known !== undefined) {
    return known;
  }
  const building = buildBundle(createWorld(), language);
  fixtureBundles.set(language, building);
  return building;
}
