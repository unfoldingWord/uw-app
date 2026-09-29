import { formatReference, parseReference, type Reference } from '../domain/reference';
import type { Library } from './library';
import type { LinkTarget, TitleHit, TitleKind } from './types';

const titleLimit = 50;
const kindOrder: readonly TitleKind[] = ['word', 'academy', 'story'];

export function fold(text: string): string {
  return text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim();
}

export function referenceQuery(query: string): Reference | undefined {
  const parsed = parseReference(query);
  return parsed.ok ? parsed.reference : undefined;
}

export function canonical(reference: Reference): string {
  return formatReference(reference);
}

function targetOf(kind: TitleKind, target: string): LinkTarget {
  return kind === 'story' ? { kind: 'story', story: Number(target) } : { kind: 'article', id: target };
}

function wordStartOf(title: string, wanted: string): number | undefined {
  let position = title.indexOf(wanted);
  while (position !== -1) {
    if (position === 0 || !/[\p{L}\p{N}]/u.test(title.charAt(position - 1))) {
      return position;
    }
    position = title.indexOf(wanted, position + 1);
  }
  return undefined;
}

export function titleHits(library: Library, query: string, language: string): TitleHit[] {
  const wanted = fold(query);
  if (wanted === '') {
    return [];
  }
  const seen = new Set<string>();
  const hits: { hit: TitleHit; rank: number }[] = [];
  for (const row of library.titles(language)) {
    const position = wordStartOf(fold(row.title), wanted);
    const key = `${row.kind}:${row.target}`;
    const entry = library.byRoot(row.root);
    if (position === undefined || seen.has(key) || entry === undefined) {
      continue;
    }
    seen.add(key);
    hits.push({
      hit: {
        kind: row.kind,
        title: row.title,
        target: targetOf(row.kind, row.target),
        provenance: entry.provenance,
      },
      rank: (position === 0 ? 0 : 1) * kindOrder.length + kindOrder.indexOf(row.kind),
    });
  }
  return hits
    .sort((left, right) => left.rank - right.rank || left.hit.title.localeCompare(right.hit.title))
    .slice(0, titleLimit)
    .map(({ hit }) => hit);
}
