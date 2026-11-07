import { readArchive } from '@lib/burrito/archive';
import { fromUtf8 } from '@lib/burrito/files';
import { storyImageUrls } from '@lib/packs/built';
import { isAllowedUrl } from '@lib/network';
import type { World } from '@sim/world';

export type ReadUrl = (url: string) => Promise<Uint8Array>;

const storyFile = /(?:^|\/)content\/\d{1,2}\.md$/;

const parallelReads = 8;

export function allowlisted(read: ReadUrl): ReadUrl {
  return async (url) => {
    if (!isAllowedUrl(url)) {
      throw new Error(`${url} is not on a Door43 host the app allows`);
    }
    return read(url);
  };
}

export async function serveUrls(world: World, read: ReadUrl, urls: readonly string[]): Promise<number> {
  const queue = [...urls];
  let served = 0;
  const worker = async (): Promise<void> => {
    for (let url = queue.shift(); url !== undefined; url = queue.shift()) {
      const body = await read(url);
      served += body.byteLength;
      world.network.serve(url, { body, headers: { 'content-type': 'application/octet-stream' } });
    }
  };
  await Promise.all(Array.from({ length: Math.min(parallelReads, urls.length) }, worker));
  return served;
}

function pictureUrlsOf(storiesArchive: Uint8Array): string[] {
  const read = readArchive(storiesArchive);
  if (!read.ok) {
    throw new Error(`the stories archive is unreadable: ${read.rule} at ${read.path}`);
  }
  const texts = [...read.files.entries()].flatMap(([path, bytes]) =>
    storyFile.test(path) ? [fromUtf8(bytes)] : [],
  );
  return storyImageUrls(texts);
}

export async function serveImageSources(world: World, read: ReadUrl, storiesUrl: string): Promise<number> {
  const archive = await read(storiesUrl);
  world.network.serve(storiesUrl, { body: archive, headers: { 'content-type': 'application/zip' } });
  return archive.byteLength + (await serveUrls(world, read, pictureUrlsOf(archive)));
}
