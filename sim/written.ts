import type { Written } from '@lib/written';

export function valueOf<T>(result: Written<T> | undefined): T | undefined {
  return result?.ok === true ? result.value : undefined;
}
