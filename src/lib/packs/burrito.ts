import { admittedRows, type ContractRow } from '../burrito/flavors';
import { readProvenance, titleOf } from '../burrito/metadata';
import { validateFacts, type BurritoFacts } from '../burrito/validate';
import type { FailureCode } from '../domain/failures';
import { fieldValidators } from '../domain/fields';
import { resourceRows, type ResourceRow } from '../domain/pack';
import { unrecordedCommit, type Provenance } from '../domain/provenance';
import type { CatalogChoice } from './source';

export const packRows: readonly ContractRow[] = admittedRows;

export type CheckedBurrito = {
  row: ResourceRow;
  provenance: Provenance;
  listed: readonly string[];
  bytes: number;
};

export type BurritoCheck = { ok: true; burrito: CheckedBurrito } | { ok: false; code: FailureCode };

const checksumRules: ReadonlySet<string> = new Set([
  'ingredient-missing',
  'ingredient-size',
  'ingredient-checksum',
]);

function eventSafe(provenance: Provenance): boolean {
  return (
    fieldValidators.publisher(provenance.publisher) &&
    fieldValidators.resource(provenance.resource) &&
    fieldValidators.language(provenance.language) &&
    fieldValidators.tag(provenance.tag) &&
    fieldValidators.token(provenance.commit)
  );
}

export function checkBurrito(facts: BurritoFacts, choice: CatalogChoice | undefined): BurritoCheck {
  const report = validateFacts(facts, { rows: packRows });
  if (report.kind === 'ignored') {
    return { ok: false, code: 'pack.unknown-flavor' };
  }
  if (report.kind === 'invalid') {
    return {
      ok: false,
      code: checksumRules.has(report.rule) ? 'pack.checksum-mismatch' : 'pack.invalid-burrito',
    };
  }
  const row = resourceRows.find((item) => item === report.row.id);
  if (row === undefined) {
    return { ok: false, code: 'pack.unknown-flavor' };
  }
  const { metadata } = report;
  const read = readProvenance(metadata);
  const licence = metadata.copyright.shortStatements[0]?.statement ?? read?.licence;
  const origin = choice ?? read;
  if (origin === undefined || licence === undefined) {
    return { ok: false, code: 'pack.no-provenance' };
  }
  const provenance: Provenance = {
    publisher: origin.publisher,
    resource: origin.resource,
    language: origin.language,
    tag: origin.tag,
    commit: choice?.commit ?? read?.commit ?? unrecordedCommit,
    licence,
    title: titleOf(metadata, choice?.title ?? origin.resource),
    ...(read?.released === undefined ? {} : { released: read.released }),
  };
  if (!eventSafe(provenance)) {
    return { ok: false, code: 'pack.no-provenance' };
  }
  const listed = Object.keys(metadata.ingredients);
  const bytes =
    (facts.metadata?.byteLength ?? 0) + listed.reduce((sum, key) => sum + (facts.fact(key)?.size ?? 0), 0);
  return { ok: true, burrito: { row, provenance, listed, bytes } };
}
