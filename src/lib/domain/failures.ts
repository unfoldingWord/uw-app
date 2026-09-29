export const failureCodes = [
  'http.offline',
  'http.timeout',
  'http.status',
  'http.host-refused',
  'http.cancelled',
  'files.not-found',
  'files.no-space',
  'files.io',
  'db.migration-failed',
  'db.io',
  'kv.io',
  'journal.persist-failed',
  'journal.event-rejected',
  'journal.import-invalid',
  'kernel.not-owned',
  'kernel.observer-failed',
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
  'corpus.unreadable',
  'transfer.unavailable',
  'transfer.unsupported',
  'transfer.declined',
  'transfer.peer-lost',
  'audio.unavailable',
  'share.unavailable',
  'partners.invalid-feed',
  'unexpected',
] as const;

export type FailureCode = (typeof failureCodes)[number];

export const failureSteps = [
  'start',
  'catalog',
  'install',
  'peer',
  'file',
  'remove',
  'update',
  'observe',
  'index',
  'ingest',
  'transfer',
  'share',
  'audio',
  'impact-stories',
] as const;

export type FailureStep = (typeof failureSteps)[number];

export type FailureContext = {
  readonly step?: FailureStep;
  readonly cause?: FailureCode;
  readonly migration?: string;
  readonly type?: string;
  readonly observer?: string;
  readonly pack?: string;
  readonly language?: string;
  readonly install?: string;
  readonly status?: number;
  readonly page?: number;
  readonly rows?: number;
  readonly unpersisted?: number;
};

export type FailureContextKind =
  'step' | 'code' | 'migration' | 'eventType' | 'moduleName' | 'pack' | 'language' | 'id' | 'count';

export const failureContextKinds: { readonly [K in keyof Required<FailureContext>]: FailureContextKind } = {
  step: 'step',
  cause: 'code',
  migration: 'migration',
  type: 'eventType',
  observer: 'moduleName',
  pack: 'pack',
  language: 'language',
  install: 'id',
  status: 'count',
  page: 'count',
  rows: 'count',
  unpersisted: 'count',
};

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
