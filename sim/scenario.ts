import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { World } from './world';

export type Scenario = {
  readonly id: string;
  readonly title: string;
  run(world: World): Promise<void>;
};

export type LoadedScenario = { file: string; name: string; scenario: Scenario };

const scenariosDirectory = join(import.meta.dirname, 'scenarios');
const requirementId = /^[A-Z]{2}-\d+$/;

export function scenario(id: string, title: string, run: (world: World) => Promise<void>): Scenario {
  if (!requirementId.test(id)) {
    throw new Error(`scenario id ${id} is not a requirement ID`);
  }
  return Object.freeze({ id, title, run });
}

function isScenario(value: unknown): value is Scenario {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  return typeof candidate.id === 'string' && typeof candidate.run === 'function';
}

export async function loadScenarios(): Promise<LoadedScenario[]> {
  const files = readdirSync(scenariosDirectory)
    .filter((file) => file.endsWith('.ts') && !file.endsWith('.test.ts'))
    .sort();
  const loaded: LoadedScenario[] = [];
  for (const file of files) {
    const module: { default?: unknown } = await import(pathToFileURL(join(scenariosDirectory, file)).href);
    if (!isScenario(module.default)) {
      throw new Error(`${file} must default-export scenario(id, title, run) from sim/scenario.ts`);
    }
    if (!file.startsWith(`${module.default.id}.`)) {
      throw new Error(`${file} is named for a different requirement than ${module.default.id}`);
    }
    loaded.push({ file, name: file.replace(/\.ts$/, ''), scenario: module.default });
  }
  return loaded;
}

export function matchScenarios(loaded: readonly LoadedScenario[], target: string): LoadedScenario[] {
  if (target === 'all') {
    return [...loaded];
  }
  return loaded.filter(
    (item) => item.name === target || item.scenario.id === target || item.name.startsWith(`${target}.`),
  );
}
