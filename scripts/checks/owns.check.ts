import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import { coreOwns } from '@lib/compose';
import { fullTextTables } from '@lib/corpus/tables';
import { kernelModules } from '@lib/kernel';
import type { Owns } from '@lib/module';
import { migrationsTable } from '@lib/migrate';
import { tablesWrittenIn } from '@lib/scope';
import { migrations } from '@sim/migrations';
import type { Check } from './check.ts';
import {
  nonLiteralTargetsIn,
  ownershipFindings,
  writerSources,
  type AdmittedTarget,
  type OwnsClaim,
  type SourceText,
} from './owns.ts';

const repositoryRoot = join(import.meta.dirname, '..', '..');
const featuresDirectory = join(repositoryRoot, 'src', 'features');
const createdTable = /^\s*CREATE\s+(?:VIRTUAL\s+)?TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(\w+)/i;

const admittedTargets: readonly AdmittedTarget[] = [
  { path: 'src/lib/migrate.ts', expression: 'migrationsTable', tables: [migrationsTable] },
  { path: 'src/lib/corpus/tables.ts', expression: 'table', tables: Object.values(fullTextTables) },
  { path: 'src/lib/corpus/fulltext.ts', expression: 'table', tables: Object.values(fullTextTables) },
];

function isOwns(value: unknown): value is Owns {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return ['tables', 'directories', 'keys'].every(
    (field) =>
      Array.isArray(record[field]) && (record[field] as unknown[]).every((item) => typeof item === 'string'),
  );
}

async function featureClaims(): Promise<OwnsClaim[] | string> {
  if (!existsSync(featuresDirectory)) {
    return [];
  }
  const claims: OwnsClaim[] = [];
  for (const entry of readdirSync(featuresDirectory, { withFileTypes: true })) {
    const store = join(featuresDirectory, entry.name, 'store.ts');
    if (!entry.isDirectory() || entry.name.startsWith('_') || !existsSync(store)) {
      continue;
    }
    const loaded: { owns?: unknown } = await import(pathToFileURL(store).href);
    if (!isOwns(loaded.owns)) {
      return `src/features/${entry.name}/store.ts must export owns: { tables, directories, keys }`;
    }
    claims.push({ owner: entry.name, folder: `src/features/${entry.name}`, ...loaded.owns });
  }
  return claims;
}

function sourcesUnder(directory: string): SourceText[] {
  return readdirSync(directory, { withFileTypes: true, recursive: true })
    .filter((entry) => entry.isFile() && /\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name))
    .map((entry) => join(entry.parentPath, entry.name))
    .map((path) => ({
      path: relative(repositoryRoot, path).split(sep).join('/'),
      text: readFileSync(path, 'utf8'),
    }));
}

const check: Check = {
  name: 'owns',
  rule: 'One writer per durable value: every table, directory and preference key is claimed by exactly one owns export, every table a migration creates has an owner, and only the owner writes it',
  async run() {
    const features = await featureClaims();
    if (typeof features === 'string') {
      return { status: 'fail', findings: [features] };
    }
    const claims: OwnsClaim[] = [
      {
        owner: 'kernel',
        folder: 'src/lib/journal',
        ...coreOwns,
        tables: coreOwns.tables.filter((table) => table !== 'schema_migrations'),
      },
      {
        owner: 'kernel migrations',
        folder: 'src/lib/migrate.ts',
        tables: ['schema_migrations'],
        directories: [],
        keys: [],
      },
      ...Object.entries(kernelModules).map(([name, module]) => ({
        owner: name,
        folder: `src/lib/${name}`,
        ...module.owns,
      })),
      ...features,
    ];
    const createdTables = migrations.flatMap((migration) =>
      migration.statements.flatMap((statement) => createdTable.exec(statement)?.[1] ?? []),
    );
    const findings = ownershipFindings({
      claims,
      createdTables,
      sources: writerSources(sourcesUnder(join(repositoryRoot, 'src'))),
      tablesWrittenIn,
      nonLiteralTargetsIn,
      admittedTargets,
    });
    if (findings.length > 0) {
      return { status: 'fail', findings };
    }
    return {
      status: 'pass',
      summary: `${claims.length} owners, ${claims.flatMap((claim) => claim.tables).length} tables, ${createdTables.length} created by migrations, one writer each; ${admittedTargets.length} table names built from a constant, each admitted with the tables it ranges over`,
    };
  },
};

export default check;
