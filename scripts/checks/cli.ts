import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { isCheck, type Check } from './check.ts';
import { runChecks } from './run.ts';

const checkFileSuffix = '.check.ts';

async function discoverChecks(): Promise<Check[]> {
  const files = readdirSync(import.meta.dirname)
    .filter((file) => file.endsWith(checkFileSuffix))
    .sort();
  const checks: Check[] = [];
  for (const file of files) {
    const loaded: { default?: unknown } = await import(pathToFileURL(join(import.meta.dirname, file)).href);
    if (!isCheck(loaded.default)) {
      throw new Error(`${file} must default-export a Check from scripts/checks/check.ts`);
    }
    checks.push(loaded.default);
  }
  return checks;
}

const report = await runChecks(await discoverChecks());
for (const line of report.lines) {
  console.log(line);
}
process.exitCode = report.passed ? 0 : 1;
