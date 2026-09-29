import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { coverage, mustRequirementIds, unproven } from './trace.ts';

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
const scenarioFiles = readdirSync(join(repositoryRoot, 'sim', 'scenarios')).filter((file) =>
  file.endsWith('.ts'),
);
const testFiles = searchedForTests
  .flatMap((directory) => filesUnder(join(repositoryRoot, directory)))
  .filter((file) => testFile.test(file))
  .map((file) => ({ path: relative(repositoryRoot, file), text: readFileSync(file, 'utf8') }));

const missing = unproven(coverage(ids, scenarioFiles, testFiles));
console.log(
  `trace: ${ids.length} Must requirements, ${ids.length - missing.length} proven, ${missing.length} unproven`,
);
if (missing.length > 0) {
  console.log(`unproven: ${missing.join(' ')}`);
}
if (!enforce) {
  console.log('trace: reporting only; enforcement is pending until T8 adds --enforce to the trace script');
}
process.exitCode = enforce && missing.length > 0 ? 1 : 0;
