import { readingOfText } from '../corpus/readings';
import type { CatalogRelease } from './types';

export const resourceTypes = [
  'literal',
  'simplified',
  'notes',
  'wordLinks',
  'questions',
  'words',
  'academy',
  'stories',
  'storyHelps',
  'formation',
  'audio',
  'images',
  'hebrew',
  'greek',
] as const;

export type ResourceType = (typeof resourceTypes)[number];

export function resourceTypeOf(
  release: Pick<CatalogRelease, 'row' | 'kind' | 'resource' | 'language' | 'title'>,
): ResourceType | undefined {
  switch (release.row) {
    case 'text':
      if (release.kind === 'original') {
        return release.language === 'hbo' ? 'hebrew' : 'greek';
      }
      return readingOfText(release.resource, release.language, {
        abbreviation: {},
        name: { en: release.title },
      });
    case 'articles':
      return release.resource.toLowerCase().split('_').at(-1) === 'ta' ? 'academy' : 'words';
    case undefined:
      return undefined;
    default:
      return release.row;
  }
}
