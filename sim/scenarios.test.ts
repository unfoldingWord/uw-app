import { describe, it } from 'vitest';
import { loadScenarios } from './scenario';
import { createWorld } from './world';

const scenarios = await loadScenarios();

describe('sim scenarios', () => {
  it.each(scenarios.map((loaded) => [loaded.file, loaded.scenario] as const))('%s', async (_, scenario) => {
    await scenario.run(createWorld());
  });
});
