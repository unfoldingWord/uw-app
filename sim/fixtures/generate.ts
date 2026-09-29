import { utf8 } from '@lib/burrito/files';
import { join } from 'node:path';
import { format, resolveConfig } from 'prettier';
import {
  burritoArchiveFile,
  burritoArchiveUrl,
  catalogLanguages,
  catalogLanguagesUrl,
  catalogSearch,
  catalogSearchUrl,
} from './catalog.ts';
import { fixtureArchive } from './archive.ts';
import { fixtureReleases } from './releases.ts';

export type FixtureRoute = { readonly url: string; readonly file: string; readonly contentType: string };

export const catalogFile = 'catalog.json';
export const languagesFile = 'languages.json';
export const routesFile = 'routes.json';
export const archiveDirectory = 'sb';

export const fixturesDirectory = import.meta.dirname;

async function json(file: string, value: unknown): Promise<Uint8Array> {
  const options = (await resolveConfig(join(fixturesDirectory, file))) ?? {};
  return utf8(await format(JSON.stringify(value), { ...options, parser: 'json' }));
}

export async function generateFixtures(): Promise<Map<string, Uint8Array>> {
  const output = new Map<string, Uint8Array>();
  const routes: FixtureRoute[] = [
    { url: catalogSearchUrl, file: catalogFile, contentType: 'application/json' },
    { url: catalogLanguagesUrl, file: languagesFile, contentType: 'application/json' },
  ];
  for (const release of fixtureReleases) {
    const file = burritoArchiveFile(release);
    output.set(file, fixtureArchive(release));
    routes.push({ url: burritoArchiveUrl(release), file, contentType: 'application/zip' });
  }
  output.set(catalogFile, await json(catalogFile, catalogSearch(fixtureReleases)));
  output.set(languagesFile, await json(languagesFile, catalogLanguages(fixtureReleases)));
  output.set(routesFile, await json(routesFile, routes));
  return output;
}
