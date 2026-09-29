import { unrecordedCommit, type Provenance } from '../domain/provenance';

export type JsonValue =
  string | number | boolean | null | readonly JsonValue[] | { readonly [key: string]: JsonValue };

export type LocalizedText = Readonly<Record<string, string>>;

export type Scope = Readonly<Record<string, readonly string[]>>;

export type IngredientEntry = {
  readonly checksum: { readonly md5: string };
  readonly mimeType: string;
  readonly size: number;
  readonly scope?: Scope;
};

type Revision = { readonly revision: string; readonly timestamp: string };

type ShortStatement = { readonly statement: string; readonly mimetype: string; readonly lang: string };

export type BurritoLanguage = {
  readonly tag: string;
  readonly name: LocalizedText;
  readonly scriptDirection?: 'ltr' | 'rtl';
};

export type BurritoMetadata = {
  readonly format: 'scripture burrito';
  readonly meta: {
    readonly version: string;
    readonly category?: string;
    readonly generator?: { readonly softwareName: string; readonly softwareVersion: string };
    readonly defaultLocale?: string;
    readonly dateCreated?: string;
    readonly normalization?: string;
  };
  readonly idAuthorities?: Readonly<Record<string, { readonly id: string; readonly name: LocalizedText }>>;
  readonly identification: {
    readonly primary?: Readonly<Record<string, Readonly<Record<string, Revision>>>>;
    readonly upstream?: Readonly<Record<string, readonly Readonly<Record<string, Revision>>[]>>;
    readonly name: LocalizedText;
    readonly abbreviation: LocalizedText;
  };
  readonly languages: readonly BurritoLanguage[];
  readonly type: {
    readonly flavorType: {
      readonly name: string;
      readonly flavor: { readonly name: string; readonly [detail: string]: JsonValue };
      readonly currentScope?: Scope;
    };
  };
  readonly confidential?: boolean;
  readonly copyright: {
    readonly shortStatements: readonly ShortStatement[];
    readonly licenses?: readonly { readonly url: string }[];
  };
  readonly ingredients: Readonly<Record<string, IngredientEntry>>;
};

export const doorAuthority = 'dcs';
export const doorAuthorityId = 'https://git.door43.org';

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function revisionOf(value: unknown): Revision | undefined {
  if (!isRecord(value) || typeof value.revision !== 'string' || typeof value.timestamp !== 'string') {
    return undefined;
  }
  return { revision: value.revision, timestamp: value.timestamp };
}

function upstreamCommit(metadata: BurritoMetadata, repository: string): string | undefined {
  const upstream: unknown = metadata.identification.upstream?.[doorAuthority];
  if (!Array.isArray(upstream)) {
    return undefined;
  }
  for (const entry of upstream) {
    const revision = isRecord(entry) ? revisionOf(entry[repository]) : undefined;
    if (revision) {
      return revision.revision;
    }
  }
  return undefined;
}

export function titleOf(metadata: BurritoMetadata, fallback: string): string {
  const names = metadata.identification.name;
  return names.en ?? Object.values(names).find((name) => name.trim() !== '') ?? fallback;
}

export function readProvenance(metadata: BurritoMetadata): Provenance | undefined {
  const primary: unknown = metadata.identification.primary?.[doorAuthority];
  if (!isRecord(primary)) {
    return undefined;
  }
  const [repository] = Object.keys(primary);
  if (repository === undefined) {
    return undefined;
  }
  const revision = revisionOf(primary[repository]);
  const [publisher, resource] = repository.split('/');
  const language = metadata.languages[0]?.tag;
  const licence = metadata.copyright.shortStatements[0]?.statement;
  if (!revision || !publisher || !resource || !language || !licence) {
    return undefined;
  }
  return {
    publisher,
    resource,
    language,
    tag: revision.revision,
    commit: upstreamCommit(metadata, repository) ?? unrecordedCommit,
    licence,
    title: titleOf(metadata, resource),
    released: revision.timestamp,
  };
}
