import { fieldValidators, type FieldKind, type FieldTypes } from './fields';
import { packKinds, packSources, resourceRows } from './pack';

export const replayClasses = ['redo', 'follows', 'verbatim'] as const;

export type ReplayClass = (typeof replayClasses)[number];

type ScalarSpec = FieldKind | `${FieldKind}?` | readonly string[];

type ListSpec = { readonly list: Readonly<Record<string, ScalarSpec>>; readonly max: number };

type FieldSpec = ScalarSpec | ListSpec;

type EventSchema = { readonly replay: ReplayClass; readonly payload: Readonly<Record<string, FieldSpec>> };

export const tracks = ['foundations', 'training', 'topics'] as const;

export const movements = [
  'observation',
  'translation',
  'discourse',
  'theological',
  'journal',
  'drafting',
  'checking',
  'conclusion',
] as const;

export const searchKinds = ['reference', 'title', 'fulltext'] as const;

export const shareKinds = ['passage', 'story', 'audio', 'journal'] as const;

export const bookmarkTargets = ['passage', 'article', 'story'] as const;

export const maximumPackBurritos = 64;

const releaseRefSpec = {
  list: { publisher: 'publisher', resource: 'resource', language: 'language', tag: 'tag' },
  max: maximumPackBurritos,
} as const;

const installedBurritoSpec = {
  list: {
    root: 'token',
    row: resourceRows,
    publisher: 'publisher',
    resource: 'resource',
    language: 'language',
    tag: 'tag',
    commit: 'token',
    bytes: 'bytes',
  },
  max: maximumPackBurritos,
} as const;

export const eventSchemas = {
  AppOpened: { replay: 'redo', payload: { day: 'day' } },
  CatalogRefreshStarted: { replay: 'redo', payload: {} },
  CatalogRefreshed: { replay: 'follows', payload: { languages: 'count', releases: 'count' } },
  PackInstallStarted: {
    replay: 'redo',
    payload: {
      install: 'id',
      pack: 'pack',
      kind: packKinds,
      source: packSources,
      language: 'language?',
      releases: releaseRefSpec,
    },
  },
  PackInstallProgressed: {
    replay: 'follows',
    payload: { install: 'id', resources: 'count', total: 'count', bytes: 'bytes' },
  },
  PackInstalled: {
    replay: 'follows',
    payload: {
      install: 'id',
      pack: 'pack',
      kind: packKinds,
      source: packSources,
      language: 'language?',
      resources: 'count',
      bytes: 'bytes',
      burritos: installedBurritoSpec,
    },
  },
  PackFailed: { replay: 'follows', payload: { install: 'id', pack: 'pack', code: 'code' } },
  PackRemoved: { replay: 'redo', payload: { pack: 'pack' } },
  PassageOpened: { replay: 'verbatim', payload: { reference: 'reference', language: 'language' } },
  ArticleOpened: { replay: 'verbatim', payload: { article: 'article', language: 'language' } },
  StoryOpened: { replay: 'verbatim', payload: { story: 'story', language: 'language' } },
  SearchRun: { replay: 'verbatim', payload: { kind: searchKinds, language: 'language', hits: 'count' } },
  IndexStarted: { replay: 'redo', payload: { language: 'language' } },
  IndexBuilt: { replay: 'follows', payload: { language: 'language', entries: 'count', bytes: 'bytes' } },
  GroupCreated: { replay: 'redo', payload: { group: 'id' } },
  GroupRenamed: { replay: 'redo', payload: { group: 'id' } },
  GroupDeleted: { replay: 'redo', payload: { group: 'id' } },
  SessionStarted: {
    replay: 'redo',
    payload: { group: 'id', track: tracks, session: 'count', language: 'language' },
  },
  StepCompleted: {
    replay: 'redo',
    payload: { group: 'id', track: tracks, session: 'count', movement: movements },
  },
  SessionCompleted: { replay: 'follows', payload: { group: 'id', track: tracks, session: 'count' } },
  SessionNoteSaved: { replay: 'redo', payload: { group: 'id', track: tracks, session: 'count' } },
  TransferOffered: { replay: 'verbatim', payload: { transfer: 'id', resources: 'count', bytes: 'bytes' } },
  TransferAccepted: { replay: 'verbatim', payload: { transfer: 'id' } },
  TransferProgressed: { replay: 'verbatim', payload: { transfer: 'id', bytes: 'bytes', total: 'bytes' } },
  TransferCompleted: { replay: 'verbatim', payload: { transfer: 'id', bytes: 'bytes' } },
  TransferFailed: { replay: 'verbatim', payload: { transfer: 'id', code: 'code' } },
  ImportReceived: { replay: 'verbatim', payload: { install: 'id' } },
  ShareSent: { replay: 'verbatim', payload: { kind: shareKinds, language: 'language?' } },
  BookmarkAdded: {
    replay: 'redo',
    payload: {
      bookmark: 'id',
      target: bookmarkTargets,
      reference: 'reference?',
      article: 'article?',
      story: 'story?',
    },
  },
  BookmarkRemoved: { replay: 'redo', payload: { bookmark: 'id' } },
  PreferenceChanged: { replay: 'redo', payload: { key: 'key', value: 'token?' } },
  InvitationShown: { replay: 'verbatim', payload: {} },
  InvitationTapped: { replay: 'verbatim', payload: {} },
  InvitationDismissed: { replay: 'verbatim', payload: {} },
  ImpactStoryOpened: { replay: 'verbatim', payload: { story: 'id' } },
  Failure: { replay: 'follows', payload: { code: 'code', context: 'context' } },
} as const satisfies Record<string, EventSchema>;

type Schemas = typeof eventSchemas;

export type EventType = keyof Schemas;

type ScalarOf<S> = S extends readonly (infer L)[]
  ? L
  : S extends `${infer K}?`
    ? K extends FieldKind
      ? FieldTypes[K]
      : never
    : S extends FieldKind
      ? FieldTypes[S]
      : never;

type RequiredFields<P> = { [K in keyof P as P[K] extends `${string}?` ? never : K]: TypeOf<P[K]> };

type OptionalFields<P> = { [K in keyof P as P[K] extends `${string}?` ? K : never]?: TypeOf<P[K]> };

type Flatten<T> = { readonly [K in keyof T]: T[K] };

type RecordOf<P> = Flatten<RequiredFields<P> & OptionalFields<P>>;

type TypeOf<S> = S extends { readonly list: infer P } ? readonly RecordOf<P>[] : ScalarOf<S>;

export type PayloadOf<T extends EventType> = RecordOf<Schemas[T]['payload']>;

export type EventOf<T extends EventType> = {
  readonly type: T;
  readonly at: number;
  readonly payload: PayloadOf<T>;
};

export type DomainEvent = { [T in EventType]: EventOf<T> }[EventType];

export type EventInput = {
  [T in EventType]: { readonly type: T; readonly payload: PayloadOf<T> };
}[EventType];

export function inputOf(event: DomainEvent): EventInput {
  return { type: event.type, payload: event.payload } as EventInput;
}

export type EventCheck = { ok: true; event: DomainEvent } | { ok: false; reason: string };

const eventTypes: ReadonlySet<string> = new Set(Object.keys(eventSchemas));

export function isEventType(value: unknown): value is EventType {
  return typeof value === 'string' && eventTypes.has(value);
}

export function replayClassOf(type: EventType): ReplayClass {
  return eventSchemas[type].replay;
}

function isListSpec(spec: FieldSpec): spec is ListSpec {
  return typeof spec === 'object' && 'list' in spec;
}

function recordProblem(specs: Readonly<Record<string, FieldSpec>>, value: unknown): string | undefined {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return '';
  }
  const unknownField = Object.keys(value).find((field) => !(field in specs));
  if (unknownField !== undefined) {
    return unknownField;
  }
  const record = value as Record<string, unknown>;
  return Object.entries(specs).find(([field, spec]) => fieldProblem(spec, record[field]))?.[0];
}

function fieldProblem(spec: FieldSpec, value: unknown): boolean {
  if (isListSpec(spec)) {
    return (
      !Array.isArray(value) ||
      value.length > spec.max ||
      value.some((item) => recordProblem(spec.list, item) !== undefined)
    );
  }
  if (typeof spec !== 'string') {
    return !spec.includes(value as string);
  }
  const optional = spec.endsWith('?');
  if (optional && value === undefined) {
    return false;
  }
  const kind = (optional ? spec.slice(0, -1) : spec) as FieldKind;
  return !fieldValidators[kind](value);
}

export function payloadProblem(type: EventType, payload: unknown): string | undefined {
  if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) {
    return `${type} payload is not an object`;
  }
  const specs: Readonly<Record<string, FieldSpec>> = eventSchemas[type].payload;
  const unknownField = Object.keys(payload).find((field) => !(field in specs));
  if (unknownField !== undefined) {
    return `${type} has no field ${unknownField}`;
  }
  const badField = recordProblem(specs, payload);
  if (badField === undefined) {
    return undefined;
  }
  const spec = specs[badField];
  const described = spec !== undefined && isListSpec(spec) ? 'list' : String(spec);
  return `${type}.${badField} is not a valid ${described}`;
}

export function checkEvent(value: unknown): EventCheck {
  if (typeof value !== 'object' || value === null) {
    return { ok: false, reason: 'event is not an object' };
  }
  const record = value as Record<string, unknown>;
  if (!isEventType(record.type)) {
    return { ok: false, reason: `unknown event type ${String(record.type)}` };
  }
  if (typeof record.at !== 'number' || !Number.isSafeInteger(record.at) || record.at < 0) {
    return { ok: false, reason: `${record.type}.at is not a clock time` };
  }
  const problem = payloadProblem(record.type, record.payload);
  if (problem !== undefined) {
    return { ok: false, reason: problem };
  }
  return { ok: true, event: { type: record.type, at: record.at, payload: record.payload } as DomainEvent };
}
