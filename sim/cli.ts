import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const scenariosDirectory = join(import.meta.dirname, 'scenarios');

function scenarioNames(): string[] {
  if (!existsSync(scenariosDirectory)) {
    return [];
  }
  return readdirSync(scenariosDirectory)
    .filter((file) => file.endsWith('.ts') && !file.endsWith('.test.ts'))
    .map((file) => file.replace(/\.ts$/, ''))
    .sort();
}

function run(target: string | undefined): number {
  if (target === undefined) {
    console.log('usage: npm run sim -- <scenario|all>');
    return 1;
  }
  const names = scenarioNames();
  if (target === 'all' && names.length === 0) {
    console.log('sim: no scenarios yet in sim/scenarios; the scenario runner arrives with the kernel (T2)');
    return 0;
  }
  if (target !== 'all' && !names.includes(target)) {
    console.log(`sim: no scenario named ${target}. Known: ${names.join(', ') || 'none'}`);
    return 1;
  }
  console.log('sim: scenarios exist but the scenario runner is pending (T2); nothing was run');
  return 1;
}

function replay(journal: string | undefined): number {
  if (journal === undefined) {
    console.log('usage: npm run replay -- <journal.json>');
    return 1;
  }
  console.log(
    `replay: pending; replaying ${journal} needs the journal and kernel (T2). Nothing was replayed`,
  );
  return 1;
}

const [command, argument] = process.argv.slice(2);
process.exitCode = command === 'replay' ? replay(argument) : command === 'run' ? run(argument) : 1;
