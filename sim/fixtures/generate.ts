import { writeArchive } from '@lib/burrito/archive';
import { buildBurrito } from '@lib/burrito/build';
import { utf8, type BurritoFiles } from '@lib/burrito/files';
import { join } from 'node:path';
import { format, resolveConfig } from 'prettier';
import {
  burritoArchiveFile,
  burritoArchiveUrl,
  catalogLanguages,
  catalogLanguagesUrl,
  catalogSearch,
  catalogSearchUrl,
  commitOf,
} from './catalog.ts';
import { fixtureReleases, type FixtureRelease } from './releases.ts';

export type FixtureRoute = { readonly url: string; readonly file: string; readonly contentType: string };

export const catalogFile = 'catalog.json';
export const languagesFile = 'languages.json';
export const routesFile = 'routes.json';
export const archiveDirectory = 'sb';

const fixtureMtime = new Date(2026, 8, 1, 0, 0, 0);
const generator = { softwareName: 'uw-app sim fixtures', softwareVersion: '1' };

function licenceText(release: FixtureRelease): string {
  return [
    '# License',
    '',
    `Copyright 2026 ${release.publisher}. Fixture content for the unfoldingWord app sim.`,
    '',
    'This work is made available under a Creative Commons Attribution-ShareAlike 4.0 International License (CC BY-SA 4.0), http://creativecommons.org/licenses/by-sa/4.0/.',
    '',
    'Bible text in the literal text fixture follows the World English Bible, which is in the public domain.',
    '',
  ].join('\n');
}

function fixtureBurrito(release: FixtureRelease): BurritoFiles {
  return buildBurrito({
    publisher: release.publisher,
    resource: release.resource,
    tag: release.tag,
    commit: commitOf(release),
    released: release.released,
    dateCreated: release.released,
    generator,
    language: {
      tag: release.language.tag,
      name: { [release.language.tag]: release.language.title, en: release.language.englishName },
      scriptDirection: release.language.direction,
    },
    name: { en: release.title },
    abbreviation: { en: release.abbreviation },
    flavorType: release.flavorType,
    flavor: release.flavor,
    ...(release.flavorDetails ? { flavorDetails: release.flavorDetails } : {}),
    ...(release.currentScope ? { currentScope: release.currentScope } : {}),
    licence: {
      statement: `Copyright 2026 ${release.publisher}, released under CC BY-SA 4.0`,
      text: licenceText(release),
    },
    ingredients: release.ingredients,
  });
}

function repositoryExtras(release: FixtureRelease): [string, Uint8Array][] {
  return [
    [
      'README.md',
      utf8(`# ${release.resource}\n\n${release.title}, a fixture release for the unfoldingWord app sim.\n`),
    ],
    ['.gitignore', utf8('.DS_Store\n')],
    ['.github/workflows/release.yml', utf8('name: release\non:\n  push:\n    tags: ["v*"]\njobs: {}\n')],
  ];
}

function fixtureArchive(release: FixtureRelease): Uint8Array {
  const files = new Map([...fixtureBurrito(release), ...repositoryExtras(release)]);
  return writeArchive(files, { root: release.resource, mtime: fixtureMtime });
}

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
