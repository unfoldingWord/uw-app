import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { coverage, mustRequirementIds, strayScenarios, unproven, withoutScenario } from './trace.ts';

const repositoryRoot = join(import.meta.dirname, '..', '..');
const enforce = process.argv.includes('--enforce');
const searchedForTests = ['src', 'sim', 'tests'];
const testFile = /\.test\.tsx?$/;

function filesUnder(directory: string): string[] {
  if (!existsSync(directory)) {
    return [];
  }
  return readdirSync(directory, { withFileTypes: true, recursive: true })
    .filter((entry) => entry.isFile())
    .map((entry) => join(entry.parentPath, entry.name));
}

const ids = mustRequirementIds(readFileSync(join(repositoryRoot, 'docs', 'PRD.md'), 'utf8'));
const scenarioFiles = readdirSync(join(repositoryRoot, 'sim', 'scenarios')).filter(
  (file) => file.endsWith('.ts') && !testFile.test(file),
);
const testFiles = searchedForTests
  .flatMap((directory) => filesUnder(join(repositoryRoot, directory)))
  .filter((file) => testFile.test(file))
  .map((file) => ({ path: relative(repositoryRoot, file), text: readFileSync(file, 'utf8') }));

const rows = coverage(ids, scenarioFiles, testFiles);
const missing = unproven(rows);
const noScenario = withoutScenario(rows);
const stray = strayScenarios(ids, scenarioFiles);
console.log(
  `trace: ${ids.length} Must requirements, ${ids.length - noScenario.length} with a scenario, ${noScenario.length - missing.length} with a test only, ${missing.length} unproven`,
);
if (noScenario.length > 0) {
  console.log(`no scenario (DX-4): ${noScenario.join(' ')}`);
}
if (missing.length > 0) {
  console.log(`unproven: ${missing.join(' ')}`);
}
if (stray.length > 0) {
  console.log(`FAIL scenarios named for no Must requirement in docs/PRD.md: ${stray.join(' ')}`);
}
if (!enforce) {
  console.log(
    'trace: reporting only for the missing scenarios; T8 adds --enforce to the trace script so a Must requirement without a scenario fails',
  );
}
process.exitCode = stray.length > 0 || (enforce && noScenario.length > 0) ? 1 : 0;
