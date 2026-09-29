import type { EventOf, EventType } from './domain/events';
import type { JournalEntry } from './journal/entry';
import type { EventDraft } from './journal/journal';
import type { JsonValue } from './json';
import type { Ports } from './ports';

export type ModuleContext = {
  ports: Ports;
  emit(draft: EventDraft): Promise<JournalEntry | undefined>;
  events(since?: number): readonly JournalEntry[];
};

export type RedoHandlers = { readonly [T in EventType]?: (event: EventOf<T>) => Promise<void> };

export type ModuleInstance<Api> = {
  api: Api;
  start?(): Promise<void>;
  observe?(entry: JournalEntry): void;
  snapshot?(): JsonValue;
  redo?: RedoHandlers;
};

export type Owns = {
  tables: readonly string[];
  directories: readonly string[];
  keys: readonly string[];
};

export type KernelModule<Api> = {
  events: readonly EventType[];
  owns: Owns;
  create(context: ModuleContext): ModuleInstance<Api>;
};

export const ownsNothing: Owns = Object.freeze({ tables: [], directories: [], keys: [] });

export function defineModule<Api>(module: KernelModule<Api>): KernelModule<Api> {
  return module;
}
