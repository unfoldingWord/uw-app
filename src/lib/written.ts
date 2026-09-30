import type { EventType } from './domain/events';
import { failureCodeOf, type FailureCode } from './domain/failures';
import type { ModuleContext } from './module';

export type Written<T> =
  { readonly ok: true; readonly value: T } | { readonly ok: false; readonly code: FailureCode };

export type DbWrite = (type: EventType, work: () => Promise<unknown>) => Promise<FailureCode | undefined>;

export function written<T>(value: T): Written<T> {
  return { ok: true, value };
}

export function refused<T>(code: FailureCode): Written<T> {
  return { ok: false, code };
}

export function dbWrite(context: Pick<ModuleContext, 'emit'>): DbWrite {
  return async (type, work) => {
    try {
      await work();
      return undefined;
    } catch (error) {
      const found = failureCodeOf(error);
      const code = found === 'unexpected' ? 'db.io' : found;
      await context.emit({ type: 'Failure', payload: { code, context: { type } } });
      return code;
    }
  };
}
