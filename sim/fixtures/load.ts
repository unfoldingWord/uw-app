import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fixturesDirectory, routesFile, type FixtureRoute } from './generate.ts';

export type FixtureResponse = FixtureRoute & { readonly bytes: Uint8Array };

export function fixtureResponses(): FixtureResponse[] {
  const routes = JSON.parse(readFileSync(join(fixturesDirectory, routesFile), 'utf8')) as FixtureRoute[];
  return routes.map((route) => ({
    ...route,
    bytes: new Uint8Array(readFileSync(join(fixturesDirectory, route.file))),
  }));
}

export function generatedFilesOnDisk(
  directories: readonly string[],
  files: readonly string[],
): Map<string, Uint8Array> {
  const found = new Map<string, Uint8Array>();
  for (const file of files) {
    found.set(file, new Uint8Array(readFileSync(join(fixturesDirectory, file))));
  }
  for (const directory of directories) {
    for (const entry of readdirSync(join(fixturesDirectory, directory), {
      recursive: true,
      withFileTypes: true,
    })) {
      if (entry.isFile()) {
        const path = relative(fixturesDirectory, join(entry.parentPath, entry.name)).split(sep).join('/');
        found.set(path, new Uint8Array(readFileSync(join(fixturesDirectory, path))));
      }
    }
  }
  return found;
}
