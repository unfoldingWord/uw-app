import { resourceCode, simplifiedTextCodes } from '../corpus/layout';
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
  release: Pick<CatalogRelease, 'row' | 'kind' | 'resource' | 'language'>,
): ResourceType | undefined {
  const code = resourceCode(release.resource, release.language);
  switch (release.row) {
    case 'text':
      if (release.kind === 'original') {
        return release.language === 'hbo' ? 'hebrew' : 'greek';
      }
      return simplifiedTextCodes.includes(code) ? 'simplified' : 'literal';
    case 'articles':
      return code === 'ta' ? 'academy' : 'words';
    case undefined:
      return undefined;
    default:
      return release.row;
  }
}
