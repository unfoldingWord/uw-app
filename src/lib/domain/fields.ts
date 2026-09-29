import {
  failureContextKinds,
  failureSteps,
  isFailureCode,
  type FailureCode,
  type FailureContext,
  type FailureContextKind,
} from './failures';
import { isLanguageTag } from './language';
import { isPackId } from './pack';
import { isCanonicalReference } from './reference';

export type FieldTypes = {
  id: string;
  slug: string;
  language: string;
  publisher: string;
  resource: string;
  tag: string;
  pack: string;
  reference: string;
  article: string;
  key: string;
  token: string;
  path: string;
  day: string;
  count: number;
  bytes: number;
  story: number;
  code: FailureCode;
  context: FailureContext;
};

export type FieldKind = keyof FieldTypes;

const patterns = {
  id: /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|[a-z]{1,16}-\d{6})$/,
  slug: /^[a-z0-9]+(-[a-z0-9]+){0,15}$/,
  publisher: /^[A-Za-z0-9][A-Za-z0-9_.-]{0,63}$/,
  resource: /^[A-Za-z0-9][A-Za-z0-9_.-]{0,63}$/,
  tag: /^[A-Za-z0-9][A-Za-z0-9._+-]{0,63}$/,
  article: /^[a-z0-9]+(\/[a-z0-9][a-z0-9_-]*){1,4}$/,
  key: /^[a-z][A-Za-z0-9]*(\.[a-z][A-Za-z0-9]*){0,3}$/,
  token: /^[A-Za-z0-9][A-Za-z0-9._:/+-]{0,127}$/,
  path: /^[A-Za-z0-9][A-Za-z0-9._+-]*(\/[A-Za-z0-9][A-Za-z0-9._+-]*){0,15}$/,
  day: /^\d{4}-\d{2}-\d{2}$/,
  migration: /^\d{4}-[a-z0-9-]{1,60}$/,
  eventType: /^[A-Z][a-z]+([A-Z][a-z]+)+$|^Failure$/,
  moduleName: /^[a-z][A-Za-z]{0,31}$/,
};

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function isWholeNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}

export function isMintedId(value: unknown): value is string {
  return isString(value) && patterns.id.test(value);
}

const failureStepSet: ReadonlySet<string> = new Set(failureSteps);

const contextValueChecks: { readonly [K in FailureContextKind]: (value: unknown) => boolean } = {
  step: (value) => isString(value) && failureStepSet.has(value),
  code: isFailureCode,
  migration: (value) => isString(value) && patterns.migration.test(value),
  eventType: (value) => isString(value) && patterns.eventType.test(value),
  moduleName: (value) => isString(value) && patterns.moduleName.test(value),
  pack: (value) => isString(value) && isPackId(value),
  language: (value) => isString(value) && isLanguageTag(value),
  id: isMintedId,
  count: isWholeNumber,
};

function isContext(value: unknown): value is FailureContext {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }
  const kinds: Readonly<Record<string, FailureContextKind | undefined>> = failureContextKinds;
  return Object.entries(value).every(([key, item]) => {
    const kind = kinds[key];
    return kind !== undefined && contextValueChecks[kind](item);
  });
}

export const fieldValidators: { readonly [K in FieldKind]: (value: unknown) => boolean } = {
  id: isMintedId,
  slug: (value) => isString(value) && patterns.slug.test(value),
  language: (value) => isString(value) && isLanguageTag(value),
  publisher: (value) => isString(value) && patterns.publisher.test(value),
  resource: (value) => isString(value) && patterns.resource.test(value),
  tag: (value) => isString(value) && patterns.tag.test(value),
  pack: (value) => isString(value) && isPackId(value),
  reference: (value) => isString(value) && isCanonicalReference(value),
  article: (value) => isString(value) && patterns.article.test(value),
  key: (value) => isString(value) && patterns.key.test(value),
  token: (value) => isString(value) && patterns.token.test(value),
  path: (value) => isString(value) && value.length <= 256 && patterns.path.test(value),
  day: (value) => isString(value) && patterns.day.test(value),
  count: isWholeNumber,
  bytes: isWholeNumber,
  story: (value) => isWholeNumber(value) && value >= 1 && value <= 50,
  code: isFailureCode,
  context: isContext,
};
