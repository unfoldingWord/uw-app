import type { DeviceSnapshot, RedoOutcome } from '@lib/compose';
import { idsOf, inputOf, replayClassOf, type DomainEvent } from '@lib/domain/events';
import type { JournalEntry } from '@lib/journal/entry';
import { parseJournalExport } from '@lib/journal/export';
import { stableJson } from '@lib/json';
import { readingLeftOut } from '@lib/share/reading';
import { createMemoryIds } from './adapters/ids';
import { createPlaybackClock, createPlaybackIds } from './adapters/playback';
import type { SimDevice } from './device';
import type { World } from './world';

export type Divergence = { index: number; recorded: string; replayed: string };

export type ReplayResult =
  | {
      ok: true;
      device: SimDevice;
      snapshot: DeviceSnapshot;
      dropped: number;
      outcomes: Readonly<Partial<Record<RedoOutcome, number>>>;
      divergence: readonly Divergence[];
    }
  | { ok: false; reason: string };

const shownDivergences = 10;

export function mintedIds(events: readonly DomainEvent[]): readonly string[] {
  const redone = new Set<string>();
  const unredoable = new Set(events.filter(readingLeftOut).flatMap((event) => idsOf(inputOf(event))));
  for (const event of events) {
    if (replayClassOf(event.type) !== 'verbatim' && !readingLeftOut(event)) {
      for (const id of idsOf(inputOf(event))) {
        redone.add(id);
      }
    }
  }
  const seen = new Set<string>();
  for (const event of events) {
    for (const id of idsOf(inputOf(event))) {
      if (redone.has(id) && !unredoable.has(id)) {
        seen.add(id);
      }
    }
  }
  return [...seen];
}

function describe(entry: JournalEntry | undefined): string {
  return entry === undefined
    ? 'nothing'
    : stableJson({ type: entry.type, at: entry.at, payload: entry.payload });
}

function compare(recorded: readonly JournalEntry[], replayed: readonly JournalEntry[]): Divergence[] {
  const differences: Divergence[] = [];
  const length = Math.max(recorded.length, replayed.length);
  for (let index = 0; index < length && differences.length < shownDivergences; index += 1) {
    const expected = describe(recorded[index]);
    const actual = describe(replayed[index]);
    if (expected !== actual) {
      differences.push({ index, recorded: expected, replayed: actual });
    }
  }
  return differences;
}

export async function replayJournal(world: World, document: unknown, name = 'replay'): Promise<ReplayResult> {
  const parsed = parseJournalExport(document);
  if (!parsed.ok) {
    return { ok: false, reason: parsed.reason };
  }
  const { events, limit, dropped, baseline } = parsed.journal;
  const device = world.device(name, {
    journalLimit: limit,
    resume: { seq: (events[0]?.seq ?? 1) - 1, dropped, baseline },
    clock: createPlaybackClock(events, world.clock),
    ids: createPlaybackIds(mintedIds(events), createMemoryIds('replay')),
  });
  const outcomes: Partial<Record<RedoOutcome, number>> = {};
  let started = false;
  for (const event of events) {
    if (!started) {
      started = true;
      await device.start();
      if (event.type === 'AppOpened') {
        outcomes.restart = (outcomes.restart ?? 0) + 1;
        continue;
      }
    }
    const outcome = await device.kernel.redo(event);
    if (outcome === 'restart') {
      await device.restart();
    }
    outcomes[outcome] = (outcomes[outcome] ?? 0) + 1;
  }
  return {
    ok: true,
    device,
    snapshot: device.kernel.snapshot(),
    dropped,
    outcomes,
    divergence: compare(events, device.kernel.journal.read()),
  };
}
