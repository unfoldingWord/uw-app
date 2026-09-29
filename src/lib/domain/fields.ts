import { isFailureCode, type FailureCode, type FailureContext } from './failures';
import { isLanguageTag } from './language';
import { isPackId } from './pack';
import { isCanonicalReference } from './reference';

export type FieldTypes = {
  id: string;
  language: string;
  publisher: string;
  resource: string;
  tag: string;
  pack: string;
  reference: string;
  article: string;
  key: string;
  token: string;
  day: string;
  count: number;
  bytes: number;
  story: number;
  code: FailureCode;
  context: FailureContext;
};

export type FieldKind = keyof FieldTypes;

const maximumContextEntries = 8;

const patterns = {
  id: /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/,
  publisher: /^[A-Za-z0-9][A-Za-z0-9_.-]{0,63}$/,
  resource: /^[a-z0-9][a-z0-9_-]{0,31}$/,
  tag: /^[A-Za-z0-9][A-Za-z0-9._+-]{0,31}$/,
  article: /^[a-z0-9]+(\/[a-z0-9][a-z0-9_-]*){1,4}$/,
  key: /^[a-z][A-Za-z0-9]*(\.[a-z][A-Za-z0-9]*){0,3}$/,
  token: /^[A-Za-z0-9][A-Za-z0-9._:/+-]{0,127}$/,
  day: /^\d{4}-\d{2}-\d{2}$/,
  contextKey: /^[a-z][A-Za-z0-9]{0,31}$/,
};

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function isWholeNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}

function isContext(value: unknown): value is FailureContext {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }
  const entries = Object.entries(value);
  return (
    entries.length <= maximumContextEntries &&
    entries.every(
      ([key, item]) =>
        patterns.contextKey.test(key) &&
        (typeof item === 'boolean' ||
          (typeof item === 'number' && Number.isFinite(item)) ||
          (isString(item) && patterns.token.test(item))),
    )
  );
}

export const fieldValidators: { readonly [K in FieldKind]: (value: unknown) => boolean } = {
  id: (value) => isString(value) && patterns.id.test(value),
  language: (value) => isString(value) && isLanguageTag(value),
  publisher: (value) => isString(value) && patterns.publisher.test(value),
  resource: (value) => isString(value) && patterns.resource.test(value),
  tag: (value) => isString(value) && patterns.tag.test(value),
  pack: (value) => isString(value) && isPackId(value),
  reference: (value) => isString(value) && isCanonicalReference(value),
  article: (value) => isString(value) && patterns.article.test(value),
  key: (value) => isString(value) && patterns.key.test(value),
  token: (value) => isString(value) && patterns.token.test(value),
  day: (value) => isString(value) && patterns.day.test(value),
  count: isWholeNumber,
  bytes: isWholeNumber,
  story: (value) => isWholeNumber(value) && value >= 1 && value <= 50,
  code: isFailureCode,
  context: isContext,
};
