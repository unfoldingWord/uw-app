import {
  idsOf,
  inputOf,
  replayClassOf,
  type DomainEvent,
  type EventInput,
  type EventType,
} from './domain/events';
import { failureCodeOf } from './domain/failures';
import type { StartFault } from './faults';
import { allowlistedHttp } from './guard';
import type { JournalEntry, JournalStats } from './journal/entry';
import type { JournalBaseline, JournalExport } from './journal/export';
import {
  createJournal,
  journalTables,
  type EventDraft,
  type JournalCheckpoint,
  type JournalResume,
} from './journal/journal';
import { canonical, type JsonValue } from './json';
import { migrationsTable, runMigrations } from './migrate';
import type { KernelModule, ModuleInstance, ModulePorts, Owns } from './module';
import type { Ids, Migration, Ports } from './ports';
import { allowlistedAudio, scopedDb, scopedFiles, scopedHttp, scopedKv, type Scope } from './scope';

export type KernelOptions = {
  migrations: readonly Migration[];
  journalLimit?: number;
  tailSize?: number;
  resume?: JournalResume;
  faults?: readonly StartFault[];
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

export type KernelControls = {
  journal: JournalView;
  start(): Promise<void>;
  resume(): Promise<boolean>;
  snapshot(): DeviceSnapshot;
  redo(event: DomainEvent): Promise<RedoOutcome>;
};

type AnyModule = KernelModule<unknown>;

export type ModuleSet = Readonly<Record<string, AnyModule>>;

type ApiOf<M> = M extends KernelModule<infer Api> ? Api : never;

export type ComposedKernel<M extends ModuleSet> = { readonly [K in keyof M]: ApiOf<M[K]> } & KernelControls;

const reservedNames: ReadonlySet<string> = new Set(['journal', 'start', 'resume', 'snapshot', 'redo']);

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

function checkpointOf(modules: ModuleSet): JournalCheckpoint {
  const folds = Object.entries(modules).flatMap(([name, module]) =>
    module.checkpoint === undefined ? [] : [{ name, checkpoint: module.checkpoint }],
  );
  return {
    initial: Object.fromEntries(folds.map(({ name, checkpoint }) => [name, checkpoint.initial])),
    step: (state, event) =>
      Object.fromEntries(
        folds.map(({ name, checkpoint }) => [
          name,
          checkpoint.step(state[name] ?? checkpoint.initial, event),
        ]),
      ),
  };
}

type MintLedger = { ids: Ids; announce(input: EventInput): void };

function mintLedger(module: string, ids: Ids): MintLedger {
  let unannounced: string | undefined;
  return {
    ids: {
      next() {
        if (unannounced !== undefined) {
          throw new Error(`${module} minted a second id before an event carried ${unannounced}`);
        }
        const id = ids.next();
        unannounced = id;
        return id;
      },
    },
    announce(input) {
      if (unannounced === undefined) {
        return;
      }
      if (input.type === 'Failure') {
        unannounced = undefined;
        return;
      }
      if (!idsOf(input).includes(unannounced)) {
        throw new Error(`${module} emitted ${input.type} before an event carried the id it minted`);
      }
      unannounced = undefined;
    },
  };
}

function modulePorts(ports: Ports, scope: Scope, ids: Ids): ModulePorts {
  return {
    clock: { dayOf: (at) => ports.clock.dayOf(at) },
    ids,
    files: scopedFiles(scope, ports.files),
    db: scopedDb(scope, ports.db),
    kv: scopedKv(scope, ports.kv),
    http: scopedHttp(scope, allowlistedHttp(ports.http)),
    transport: ports.transport,
    audio: allowlistedAudio(ports.audio),
    shareSheet: ports.shareSheet,
    picker: ports.picker,
    locale: ports.locale,
  };
}

function isObserverFailure(entry: JournalEntry): boolean {
  return entry.type === 'Failure' && entry.payload.context.observer !== undefined;
}

export function composeKernel<M extends ModuleSet>(
  ports: Ports,
  modules: M,
  options: KernelOptions,
): ComposedKernel<M> {
  const owners = eventOwners(modules);
  const instances = new Map<string, ModuleInstance<unknown>>();
  const checkpoints = new Map(Object.entries(modules).map(([name, module]) => [name, module.checkpoint]));

  async function react(entry: JournalEntry): Promise<void> {
    const reactions = [...instances.entries()].flatMap(([name, instance]) => {
      if (instance.observe === undefined) {
        return [];
      }
      try {
        return [{ name, settled: Promise.resolve(instance.observe(entry)) }];
      } catch (error) {
        return [{ name, settled: Promise.reject(error) }];
      }
    });
    const outcomes = await Promise.allSettled(reactions.map((reaction) => reaction.settled));
    for (const [index, outcome] of outcomes.entries()) {
      const observer = reactions[index]?.name;
      if (outcome.status === 'fulfilled' || observer === undefined || isObserverFailure(entry)) {
        continue;
      }
      await journal.append({
        type: 'Failure',
        payload: {
          code: 'kernel.observer-failed',
          context: { observer, type: entry.type, cause: failureCodeOf(outcome.reason) },
        },
      });
    }
  }

  const journal = createJournal({
    db: ports.db,
    clock: ports.clock,
    checkpoint: checkpointOf(modules),
    ...(options.journalLimit === undefined ? {} : { limit: options.journalLimit }),
    ...(options.resume === undefined ? {} : { resume: options.resume }),
    onEntry: react,
  });
  const tailSize = options.tailSize ?? defaultTailSize;
  let started = false;
  let openedDay: string | undefined;

  for (const [name, module] of Object.entries(modules)) {
    const ledger = mintLedger(name, ports.ids);
    const scope: Scope = { module: name, ...module.owns };
    const emit = (draft: EventDraft): Promise<JournalEntry | undefined> =>
      journal.append((at) => {
        const input = typeof draft === 'function' ? draft(at) : draft;
        if (input.type !== 'Failure' && owners.get(input.type) !== name) {
          throw new Error(`${name} emitted ${input.type}, which it does not own`);
        }
        ledger.announce(input);
        return input;
      });
    const baseline = (): JsonValue => {
      const state: JournalBaseline = journal.baseline();
      return state[name] ?? checkpoints.get(name)?.initial ?? null;
    };
    instances.set(
      name,
      module.create({
        ports: modulePorts(ports, scope, ledger.ids),
        emit,
        events: (since) => journal.read(since),
        baseline,
      }),
    );
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

  async function appOpened(): Promise<void> {
    await journal.append((at) => {
      openedDay = ports.clock.dayOf(at);
      return { type: 'AppOpened', payload: { day: openedDay } };
    });
  }

  const controls: KernelControls = {
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
          payload: {
            code: 'db.migration-failed',
            context: migrated.failed === undefined ? {} : { migration: migrated.failed },
          },
        });
      }
      for (const fault of options.faults ?? []) {
        await journal.append({
          type: 'Failure',
          payload: { code: fault.code, context: { step: fault.step } },
        });
      }
      for (const instance of instances.values()) {
        await instance.start?.();
      }
      await appOpened();
    },
    async resume() {
      if (!started || openedDay === ports.clock.dayOf(ports.clock.now())) {
        return false;
      }
      await appOpened();
      return true;
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
  return Object.freeze({ ...apis, ...controls }) as ComposedKernel<M>;
}
