import { inputOf, replayClassOf, type DomainEvent, type EventType } from './domain/events';
import { allowlistedHttp } from './guard';
import type { JournalEntry, JournalStats } from './journal/entry';
import type { JournalExport } from './journal/export';
import { createJournal, journalTables, type EventDraft } from './journal/journal';
import { canonical, type JsonValue } from './json';
import { migrationsTable, runMigrations } from './migrate';
import type { KernelModule, ModuleInstance, Owns } from './module';
import type { Migration, Ports } from './ports';

export type KernelOptions = {
  migrations: readonly Migration[];
  journalLimit?: number;
  tailSize?: number;
};

export type JournalView = {
  read(since?: number): readonly JournalEntry[];
  stats(): JournalStats;
  export(): JournalExport;
};

export type DeviceSnapshot = {
  version: 1;
  journal: JournalStats & { tail: readonly JournalEntry[] };
  modules: Readonly<Record<string, JsonValue>>;
};

export type RedoOutcome = 'redone' | 'appended' | 'skipped' | 'restart' | 'unhandled';

export type KernelCore = {
  journal: JournalView;
  start(): Promise<void>;
  snapshot(): DeviceSnapshot;
  redo(event: DomainEvent): Promise<RedoOutcome>;
};

type AnyModule = KernelModule<unknown>;

export type ModuleSet = Readonly<Record<string, AnyModule>>;

type ApiOf<M> = M extends KernelModule<infer Api> ? Api : never;

export type ComposedKernel<M extends ModuleSet> = { readonly [K in keyof M]: ApiOf<M[K]> } & KernelCore;

const reservedNames: ReadonlySet<string> = new Set(['journal', 'start', 'snapshot', 'redo']);

const coreEvents: readonly EventType[] = ['AppOpened', 'Failure'];

const defaultTailSize = 50;

export const coreOwns: Owns = Object.freeze({
  tables: [migrationsTable, ...journalTables],
  directories: [],
  keys: [],
});

function eventOwners(modules: ModuleSet): ReadonlyMap<EventType, string> {
  const owners = new Map<EventType, string>();
  for (const [name, module] of Object.entries(modules)) {
    if (reservedNames.has(name)) {
      throw new Error(`module name ${name} is reserved by the kernel`);
    }
    for (const type of module.events) {
      const owner = coreEvents.includes(type) ? 'kernel' : owners.get(type);
      if (owner !== undefined) {
        throw new Error(`${name} and ${owner} both emit ${type}`);
      }
      owners.set(type, name);
    }
  }
  return owners;
}

export function composeKernel<M extends ModuleSet>(
  ports: Ports,
  modules: M,
  options: KernelOptions,
): ComposedKernel<M> {
  const owners = eventOwners(modules);
  const instances = new Map<string, ModuleInstance<unknown>>();
  const journal = createJournal({
    db: ports.db,
    clock: ports.clock,
    ...(options.journalLimit === undefined ? {} : { limit: options.journalLimit }),
    onEntry: (entry) => {
      for (const instance of instances.values()) {
        instance.observe?.(entry);
      }
    },
  });
  const guardedPorts: Ports = { ...ports, http: allowlistedHttp(ports.http) };
  const tailSize = options.tailSize ?? defaultTailSize;
  let started = false;

  for (const [name, module] of Object.entries(modules)) {
    const emit = (draft: EventDraft): Promise<JournalEntry | undefined> =>
      journal.append((at) => {
        const input = typeof draft === 'function' ? draft(at) : draft;
        if (input.type !== 'Failure' && owners.get(input.type) !== name) {
          throw new Error(`${name} emitted ${input.type}, which it does not own`);
        }
        return input;
      });
    instances.set(name, module.create({ ports: guardedPorts, emit, events: (since) => journal.read(since) }));
  }

  const view: JournalView = {
    read: (since) => journal.read(since),
    stats: () => journal.stats(),
    export: () => journal.export(),
  };

  async function redo(event: DomainEvent): Promise<RedoOutcome> {
    const replay = replayClassOf(event.type);
    if (replay === 'follows') {
      return 'skipped';
    }
    if (replay === 'verbatim') {
      const owner = owners.get(event.type);
      if (owner === undefined) {
        return 'unhandled';
      }
      await journal.append(inputOf(event));
      return 'appended';
    }
    if (event.type === 'AppOpened') {
      return 'restart';
    }
    const owner = owners.get(event.type);
    const handler = owner === undefined ? undefined : instances.get(owner)?.redo?.[event.type];
    if (handler === undefined) {
      return 'unhandled';
    }
    await (handler as (recorded: DomainEvent) => Promise<void>)(event);
    return 'redone';
  }

  const core: KernelCore = {
    journal: view,
    async start() {
      if (started) {
        return;
      }
      started = true;
      const migrated = await runMigrations(ports.db, options.migrations);
      await journal.load();
      if (!migrated.ok) {
        await journal.append({
          type: 'Failure',
          payload: { code: 'db.migration-failed', context: { migration: migrated.failed } },
        });
      }
      for (const instance of instances.values()) {
        await instance.start?.();
      }
      await journal.append((at) => ({ type: 'AppOpened', payload: { day: ports.clock.dayOf(at) } }));
    },
    snapshot() {
      const stats = journal.stats();
      const entries = journal.read();
      return canonical({
        version: 1,
        journal: { ...stats, tail: entries.slice(Math.max(0, entries.length - tailSize)) },
        modules: Object.fromEntries(
          [...instances.entries()].map(([name, instance]) => [name, instance.snapshot?.() ?? null]),
        ),
      });
    },
    redo,
  };

  const apis = Object.fromEntries([...instances.entries()].map(([name, instance]) => [name, instance.api]));
  return Object.freeze({ ...apis, ...core }) as ComposedKernel<M>;
}
