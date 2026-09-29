import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

export type Coverage = { id: string; scenarios: string[]; tests: string[] };

const requirementRow = /^\|\s*([A-Z]{2}-\d+)\s*\|.*\|\s*Must\s*\|\s*$/;
const scenarioName = /^([A-Z]{2}-\d+)\./;

export function mustRequirementIds(prd: string): string[] {
  return prd.split('\n').flatMap((line) => {
    const id = requirementRow.exec(line.trim())?.[1];
    return id === undefined ? [] : [id];
  });
}

export function coverage(
  ids: string[],
  scenarioFiles: string[],
  testFiles: { path: string; text: string }[],
): Coverage[] {
  return ids.map((id) => ({
    id,
    scenarios: scenarioFiles.filter((file) => scenarioName.exec(file)?.[1] === id),
    tests: testFiles
      .filter((test) => new RegExp(`(^|[^A-Z0-9-])${id}([^0-9]|$)`).test(test.text))
      .map((test) => test.path),
  }));
}

export function unproven(rows: Coverage[]): string[] {
  return rows.filter((row) => row.scenarios.length === 0 && row.tests.length === 0).map((row) => row.id);
}

export const testProvenRequirements: Readonly<Record<string, string>> = Object.freeze({
  'SE-2':
    'proven by the type-level test src/shared/glass/names.test.ts, which refuses an interactive glass primitive without an accessible name; dynamic type and contrast on glass are verified on a phone, not in the sim (docs/exceptions.md)',
});

export function withoutScenario(
  rows: Coverage[],
  allowed: Readonly<Record<string, string>> = testProvenRequirements,
): string[] {
  return rows
    .filter((row) => row.scenarios.length === 0 && !(row.id in allowed && row.tests.length > 0))
    .map((row) => row.id);
}

export function provenByTestOnly(
  rows: Coverage[],
  allowed: Readonly<Record<string, string>> = testProvenRequirements,
): string[] {
  return rows
    .filter((row) => row.scenarios.length === 0 && row.id in allowed && row.tests.length > 0)
    .map((row) => row.id);
}

export type TraceReport = {
  ids: string[];
  rows: Coverage[];
  missing: string[];
  noScenario: string[];
  byTest: string[];
  stray: string[];
};

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

export const repositoryRoot = join(import.meta.dirname, '..');

export function traceRepository(root: string = repositoryRoot): TraceReport {
  const ids = mustRequirementIds(readFileSync(join(root, 'docs', 'PRD.md'), 'utf8'));
  const scenarioFiles = readdirSync(join(root, 'sim', 'scenarios')).filter(
    (file) => file.endsWith('.ts') && !testFile.test(file),
  );
  const testFiles = searchedForTests
    .flatMap((directory) => filesUnder(join(root, directory)))
    .filter((file) => testFile.test(file))
    .map((file) => ({ path: relative(root, file), text: readFileSync(file, 'utf8') }));
  const rows = coverage(ids, scenarioFiles, testFiles);
  return {
    ids,
    rows,
    missing: unproven(rows),
    noScenario: withoutScenario(rows),
    byTest: provenByTestOnly(rows),
    stray: strayScenarios(ids, scenarioFiles),
  };
}

export function strayScenarios(ids: string[], scenarioFiles: string[]): string[] {
  return scenarioFiles.filter((file) => {
    const id = scenarioName.exec(file)?.[1];
    return id === undefined || !ids.includes(id);
  });
}
