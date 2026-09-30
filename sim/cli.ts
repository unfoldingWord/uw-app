import { readFileSync } from 'node:fs';
import type { JournalEntry } from '@lib/journal/entry';
import { replayJournal } from './replay';
import { loadScenarios, matchScenarios, type LoadedScenario } from './scenario';
import { createWorld, type World } from './world';

function journalLine(entry: JournalEntry): string {
  return `  ${String(entry.seq).padStart(5)} ${new Date(entry.at).toISOString()} ${entry.type} ${JSON.stringify(entry.payload)}`;
}

function printWorld(world: World): void {
  for (const device of world.devices()) {
    console.log(`\ndevice ${device.name}`);
    console.log('snapshot');
    console.log(JSON.stringify(device.kernel.snapshot(), null, 2));
    console.log('journal');
    device.kernel.journal.read().forEach((entry) => console.log(journalLine(entry)));
  }
}

async function runOne(loaded: LoadedScenario, detailed: boolean): Promise<boolean> {
  const world = createWorld();
  try {
    await loaded.scenario.run(world);
    console.log(`pass  ${loaded.name}: ${loaded.scenario.title}`);
    return true;
  } catch (error) {
    console.log(`FAIL  ${loaded.name}: ${loaded.scenario.title}`);
    console.log(`      ${error instanceof Error ? error.message : String(error)}`);
    return false;
  } finally {
    if (detailed) {
      printWorld(world);
    }
  }
}

async function run(target: string | undefined): Promise<number> {
  if (target === undefined) {
    console.log('usage: npm run sim -- <scenario|all>');
    return 1;
  }
  const loaded = await loadScenarios();
  const chosen = matchScenarios(loaded, target);
  if (chosen.length === 0) {
    console.log(
      `sim: no scenario matches ${target}. Known: ${loaded.map((item) => item.name).join(', ') || 'none'}`,
    );
    return 1;
  }
  let failures = 0;
  for (const item of chosen) {
    failures += (await runOne(item, target !== 'all')) ? 0 : 1;
  }
  console.log(`\nsim: ${chosen.length} scenarios, ${chosen.length - failures} passed, ${failures} failed`);
  return failures === 0 ? 0 : 1;
}

async function replay(path: string | undefined): Promise<number> {
  if (path === undefined) {
    console.log('usage: npm run replay -- <journal.json>');
    return 1;
  }
  let document: unknown;
  try {
    document = JSON.parse(readFileSync(path, 'utf8'));
  } catch (error) {
    console.log(`replay: cannot read ${path}: ${error instanceof Error ? error.message : String(error)}`);
    return 1;
  }
  const world = createWorld();
  const result = await replayJournal(world, document);
  if (!result.ok) {
    console.log(`replay: ${path} is not a journal: ${result.reason}`);
    return 1;
  }
  printWorld(world);
  console.log(`\nreplay: outcomes ${JSON.stringify(result.outcomes)}`);
  if (result.dropped > 0) {
    console.log(
      `replay: ${result.dropped} events were dropped before export; the rebuild starts from the tail`,
    );
  }
  if (result.divergence.length > 0) {
    console.log('replay: the rebuilt journal diverges from the recorded one');
    result.divergence.forEach((item) =>
      console.log(`  at ${item.index}\n    recorded ${item.recorded}\n    replayed ${item.replayed}`),
    );
    return 1;
  }
  console.log('replay: the rebuilt journal matches the recorded one event for event');
  return 0;
}

const [command, argument] = process.argv.slice(2);
process.exitCode = await (command === 'replay' ? replay(argument) : command === 'run' ? run(argument) : 1);
