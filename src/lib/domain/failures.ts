export const failureCodes = [
  'http.offline',
  'http.timeout',
  'http.status',
  'http.host-refused',
  'files.not-found',
  'files.no-space',
  'files.io',
  'db.migration-failed',
  'db.io',
  'kv.io',
  'journal.persist-failed',
  'journal.event-rejected',
  'journal.import-invalid',
  'catalog.invalid-response',
  'catalog.superseded',
  'pack.not-found',
  'pack.no-space',
  'pack.checksum-mismatch',
  'pack.invalid-burrito',
  'pack.unknown-flavor',
  'pack.no-provenance',
  'pack.empty-plan',
  'pack.mixed-packs',
  'transfer.unavailable',
  'transfer.unsupported',
  'transfer.declined',
  'transfer.peer-lost',
  'audio.unavailable',
  'share.unavailable',
  'unexpected',
] as const;

export type FailureCode = (typeof failureCodes)[number];

export type FailureContextValue = string | number | boolean;

export type FailureContext = Readonly<Record<string, FailureContextValue>>;

const codes: ReadonlySet<string> = new Set(failureCodes);

export function isFailureCode(value: unknown): value is FailureCode {
  return typeof value === 'string' && codes.has(value);
}

export function failureCodeOf(error: unknown): FailureCode {
  if (typeof error === 'object' && error !== null && 'code' in error && isFailureCode(error.code)) {
    return error.code;
  }
  return 'unexpected';
}
