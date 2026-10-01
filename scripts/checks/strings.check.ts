import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { failureCodes } from '@lib/domain/failures';
import { preferenceKeys } from '@lib/domain/preferences';
import { locales } from '@lib/strings/locales';
import { pluralCategoriesOf } from '@lib/strings/plural';
import { tables } from '@lib/strings/locales/index';
import type { Check, CheckOutcome } from './check.ts';
import { scannedRoots, scanSource } from './strings-literals.ts';
import { auditTable, copyFindings, textsOf, type Table } from './strings-table.ts';

const repositoryRoot = join(import.meta.dirname, '..', '..');

const sourceFile = /\.tsx?$/;
const testFile = /\.test\.tsx?$/;

function filesUnder(directory: string): string[] {
  const absolute = join(repositoryRoot, directory);
  if (!existsSync(absolute)) {
    return [];
  }
  return readdirSync(absolute, { withFileTypes: true, recursive: true })
    .filter((entry) => entry.isFile() && sourceFile.test(entry.name) && !testFile.test(entry.name))
    .map((entry) => relative(repositoryRoot, join(entry.parentPath, entry.name)))
    .sort();
}

function tableFindings(): string[] {
  const english: Table = tables.en;
  const findings: string[] = [];
  for (const code of failureCodes) {
    if (!(`failure.${code}` in english)) {
      findings.push(`en: failure code ${code} has no string failure.${code}`);
    }
  }
  for (const locale of locales) {
    const table: Table = tables[locale];
    findings.push(...auditTable(locale, table, english, [...pluralCategoriesOf(locale)]));
    for (const { key, text } of textsOf(table)) {
      findings.push(...copyFindings(locale, key, text));
    }
  }
  return findings;
}

function englishKeyOf(text: string): string | undefined {
  return textsOf(tables.en).find((entry) => entry.text === text)?.key;
}

const tableNames: ReadonlySet<string> = new Set([
  ...Object.keys(tables.en),
  ...failureCodes,
  ...failureCodes.map((code) => `failure.${code}`),
  ...preferenceKeys,
]);

function literalFindings(): { findings: string[]; files: number } {
  const findings: string[] = [];
  let files = 0;
  for (const root of scannedRoots) {
    for (const path of filesUnder(root.directory)) {
      files += 1;
      const found = scanSource(path, readFileSync(join(repositoryRoot, path), 'utf8'), {
        prose: root.prose,
        names: tableNames,
      });
      for (const finding of found) {
        const key = englishKeyOf(finding.text);
        const advice = key === undefined ? 'add it to src/lib/strings' : `use ${key}`;
        findings.push(`${finding.file}:${finding.line} has the literal "${finding.text}"; ${advice}`);
      }
    }
  }
  return { findings, files };
}

function completenessLine(): string {
  const keys = Object.keys(tables.en);
  return locales
    .map((locale) => {
      const table: Table = tables[locale];
      const translated = keys.filter((key) => table[key] !== null && table[key] !== undefined).length;
      return `${locale} ${translated}/${keys.length}`;
    })
    .join(', ');
}

function run(): CheckOutcome {
  const literals = literalFindings();
  const findings = [...tableFindings(), ...literals.findings];
  if (findings.length > 0) {
    return { status: 'fail', findings };
  }
  return {
    status: 'pass',
    summary: `${Object.keys(tables.en).length} keys in ${locales.length} locales (${completenessLine()}); ${literals.files} feature, app and shared files hold no literal copy`,
  };
}

const check: Check = {
  name: 'strings',
  rule: 'Every locale lists every key, the copy follows the voice rules, and no literal copy in app/, src/features/ or src/shared/ bypasses the string table',
  run,
};

export default check;
