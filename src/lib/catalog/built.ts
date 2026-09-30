import { audioPackId, imagePackId } from '../domain/pack';
import type { CatalogRelease } from './types';

const imagePackSource = { publisher: 'unfoldingWord', resource: 'en_obs' } as const;

function knownBytes(release: CatalogRelease): number | undefined {
  const sizes = release.assets.map((asset) => asset.bytes);
  return sizes.some((bytes) => bytes === undefined)
    ? undefined
    : sizes.reduce<number>((sum, bytes) => sum + (bytes ?? 0), 0);
}

function imageRelease(stored: readonly CatalogRelease[]): CatalogRelease[] {
  const stories = stored.find(
    (release) =>
      release.publisher === imagePackSource.publisher &&
      release.resource === imagePackSource.resource &&
      release.row === 'stories',
  );
  return stories === undefined
    ? []
    : [
        {
          ...stories,
          row: 'images',
          kind: 'image',
          pack: imagePackId,
          bytes: undefined,
          assets: [],
          built: 'images',
        },
      ];
}

const storiesSubject = 'Open Bible Stories';

export function isStoryAudio(release: Pick<CatalogRelease, 'subject' | 'resource'>): boolean {
  return release.subject === storiesSubject || /_obs$/i.test(release.resource);
}

function carriesAudio(release: CatalogRelease): boolean {
  return (
    release.assets.length > 0 &&
    release.kind === 'language' &&
    (release.row === 'text' || release.row === 'stories')
  );
}

function audioReleases(stored: readonly CatalogRelease[]): CatalogRelease[] {
  return stored.filter(carriesAudio).map((release) => ({
    ...release,
    row: 'audio',
    kind: 'audio',
    pack: audioPackId(release.language, release.resource),
    bytes: knownBytes(release),
    built: 'audio',
  }));
}

export function withBuiltReleases(releases: readonly CatalogRelease[]): CatalogRelease[] {
  const stored = releases.filter((release) => release.built === undefined);
  return [...stored, ...imageRelease(stored), ...audioReleases(stored)];
}
