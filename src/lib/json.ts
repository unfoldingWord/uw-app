export type JsonValue =
  null | boolean | number | string | readonly JsonValue[] | { readonly [key: string]: JsonValue | undefined };

function sortedValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortedValue);
  }
  if (typeof value === 'object' && value !== null) {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .flatMap((key) => {
          const item: unknown = (value as Record<string, unknown>)[key];
          return item === undefined ? [] : [[key, sortedValue(item)]];
        }),
    );
  }
  return value;
}

export function canonical<T>(value: T): T {
  return sortedValue(value) as T;
}

export function stableJson(value: unknown): string {
  return JSON.stringify(sortedValue(value));
}

export function deepFreeze<T>(value: T): T {
  if (typeof value === 'object' && value !== null && !Object.isFrozen(value)) {
    for (const item of Object.values(value)) {
      deepFreeze(item);
    }
    Object.freeze(value);
  }
  return value;
}
