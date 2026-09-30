import type { Provenance } from '../domain/provenance';

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

type Revision = { readonly revision: string; readonly timestamp?: string };

type ShortStatement = { readonly statement: string; readonly mimetype?: string; readonly lang?: string };

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
    readonly generator?: {
      readonly softwareName: string;
      readonly softwareVersion: string;
      readonly userName?: string;
    };
    readonly defaultLocale?: string;
    readonly dateCreated?: string;
    readonly normalization?: string;
  };
  readonly idAuthorities?: Readonly<Record<string, { readonly id: string; readonly name: LocalizedText }>>;
  readonly identification: {
    readonly primary?: Readonly<Record<string, Readonly<Record<string, Revision>>>>;
    readonly name: LocalizedText;
    readonly description?: LocalizedText;
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

export const unrecordedTag = 'unrecorded';

export const doorAuthority = 'dcs';
export const doorAuthorityId = 'https://git.door43.org';

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function revisionOf(value: unknown): Revision | undefined {
  if (!isRecord(value) || typeof value.revision !== 'string' || value.revision.trim() === '') {
    return undefined;
  }
  return typeof value.timestamp === 'string'
    ? { revision: value.revision, timestamp: value.timestamp }
    : { revision: value.revision };
}

export function titleOf(metadata: BurritoMetadata, fallback: string): string {
  const names = metadata.identification.name;
  return names.en ?? Object.values(names).find((name) => name.trim() !== '') ?? fallback;
}

export function primaryRepository(metadata: unknown): string | undefined {
  const identification = isRecord(metadata) ? metadata.identification : undefined;
  const primary = isRecord(identification) ? identification.primary : undefined;
  const authority = isRecord(primary) ? primary[doorAuthority] : undefined;
  if (!isRecord(authority)) {
    return undefined;
  }
  return Object.keys(authority)[0];
}

export function repositoryCode(repository: string | undefined): string | undefined {
  const name = repository?.split('/').at(-1)?.toLowerCase();
  return name === undefined || name === '' ? undefined : name.split('_').at(-1);
}

export function readProvenance(metadata: BurritoMetadata): Provenance | undefined {
  const repository = primaryRepository(metadata);
  if (repository === undefined) {
    return undefined;
  }
  const primary: unknown = metadata.identification.primary?.[doorAuthority];
  const revision = revisionOf(isRecord(primary) ? primary[repository] : undefined);
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
    tag: unrecordedTag,
    commit: revision.revision,
    licence,
    title: titleOf(metadata, resource),
  };
}
