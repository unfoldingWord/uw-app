import { matchTerms } from './fulltext';
import type { Library } from './library';
import { stories } from './loaders';
import { fold } from './search';
import type { FullTextHit } from './types';

async function matchingFrame(
  library: Library,
  language: string,
  story: number,
  terms: readonly string[],
): Promise<number | undefined> {
  for (const entry of library.of(language, ['stories'])) {
    const parsed = (await stories(library, entry)).get(story);
    if (parsed === undefined) {
      continue;
    }
    const found = parsed.frames.find((frame) => {
      const text = fold(frame.text);
      return terms.some((term) => text.includes(term));
    });
    return found?.number;
  }
  return undefined;
}

export async function anchorStoryHits(
  library: Library,
  language: string,
  query: string,
  hits: readonly FullTextHit[],
): Promise<FullTextHit[]> {
  const terms = matchTerms(query).map(fold);
  return Promise.all(
    hits.map(async (hit) => {
      if (hit.target.kind !== 'story' || terms.length === 0) {
        return hit;
      }
      const frame = await matchingFrame(library, language, hit.target.story, terms);
      return frame === undefined ? hit : { ...hit, target: { ...hit.target, frame } };
    }),
  );
}
