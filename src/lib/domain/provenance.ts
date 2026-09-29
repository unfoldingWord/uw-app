import { door43 } from './release';

export const unrecordedCommit = 'unrecorded';

export type Provenance = {
  publisher: string;
  resource: string;
  language: string;
  tag: string;
  commit: string;
  licence: string;
  title: string;
  released?: string;
};

const provenanceFields = ['publisher', 'resource', 'language', 'tag', 'commit', 'licence', 'title'] as const;

export function isProvenance(value: unknown): value is Provenance {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return (
    provenanceFields.every((field) => typeof record[field] === 'string' && record[field] !== '') &&
    (record.released === undefined || typeof record.released === 'string')
  );
}

export function sameRelease(left: Provenance, right: Provenance): boolean {
  return (
    left.publisher === right.publisher &&
    left.resource === right.resource &&
    left.language === right.language &&
    left.tag === right.tag
  );
}

export function sourceUrlOf(provenance: Pick<Provenance, 'publisher' | 'resource' | 'tag'>): string {
  return `${door43}/${provenance.publisher}/${provenance.resource}/releases/tag/${provenance.tag}`;
}
