import { writeArchive } from '@lib/burrito/archive';
import { buildBurrito } from '@lib/burrito/build';
import { utf8, type BurritoFiles } from '@lib/burrito/files';
import { commitOf } from './catalog.ts';
import type { FixtureRelease } from './releases.ts';

const fixtureMtime = new Date(2026, 8, 1, 0, 0, 0);
const generator = { softwareName: 'uw-app sim fixtures', softwareVersion: '1' };

export function licenceText(release: FixtureRelease): string {
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
    commit: commitOf(release),
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
      statement: release.statement?.statement ?? `© ${release.publisher} 2026, CC BY-SA 4.0`,
      text: licenceText(release),
      bare: release.statement?.bare ?? false,
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

export function fixtureArchive(release: FixtureRelease): Uint8Array {
  const files = new Map([...fixtureBurrito(release), ...repositoryExtras(release)]);
  return writeArchive(files, { root: release.resource, mtime: fixtureMtime });
}
