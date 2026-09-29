import { admittedRows, type ContractRow } from '../burrito/flavors';
import { metadataPath, type BurritoFiles } from '../burrito/files';
import { readProvenance, titleOf, type BurritoMetadata } from '../burrito/metadata';
import { validate } from '../burrito/validate';
import type { FailureCode } from '../domain/failures';
import { fieldValidators } from '../domain/fields';
import { resourceRows, type ResourceRow } from '../domain/pack';
import { unrecordedCommit, type Provenance } from '../domain/provenance';
import type { CatalogChoice } from './source';

export const packRows: readonly ContractRow[] = admittedRows;

export type CheckedBurrito = {
  files: BurritoFiles;
  row: ResourceRow;
  provenance: Provenance;
};

export type BurritoCheck = { ok: true; burrito: CheckedBurrito } | { ok: false; code: FailureCode };

const checksumRules: ReadonlySet<string> = new Set([
  'ingredient-missing',
  'ingredient-size',
  'ingredient-checksum',
]);

function listedOnly(files: BurritoFiles, metadata: BurritoMetadata): BurritoFiles {
  const kept = new Map<string, Uint8Array>();
  for (const path of [metadataPath, ...Object.keys(metadata.ingredients)]) {
    const bytes = files.get(path);
    if (bytes !== undefined) {
      kept.set(path, bytes);
    }
  }
  return kept;
}

function eventSafe(provenance: Provenance): boolean {
  return (
    fieldValidators.publisher(provenance.publisher) &&
    fieldValidators.resource(provenance.resource) &&
    fieldValidators.language(provenance.language) &&
    fieldValidators.tag(provenance.tag) &&
    fieldValidators.token(provenance.commit)
  );
}

export function checkBurrito(files: BurritoFiles, choice: CatalogChoice | undefined): BurritoCheck {
  const report = validate(files, { rows: packRows });
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
  return {
    ok: true,
    burrito: { files: listedOnly(files, metadata), row, provenance },
  };
}
