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

export function withoutScenario(rows: Coverage[]): string[] {
  return rows.filter((row) => row.scenarios.length === 0).map((row) => row.id);
}

export function strayScenarios(ids: string[], scenarioFiles: string[]): string[] {
  return scenarioFiles.filter((file) => {
    const id = scenarioName.exec(file)?.[1];
    return id === undefined || !ids.includes(id);
  });
}
