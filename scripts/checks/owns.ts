export type OwnsClaim = {
  owner: string;
  folder: string;
  tables: readonly string[];
  directories: readonly string[];
  keys: readonly string[];
};

export type SourceText = { path: string; text: string };

export type AdmittedTarget = { path: string; expression: string; tables: readonly string[] };

export type OwnershipInput = {
  claims: readonly OwnsClaim[];
  createdTables: readonly string[];
  sources: readonly SourceText[];
  tablesWrittenIn(text: string): readonly string[];
  nonLiteralTargetsIn?(text: string): readonly string[];
  admittedTargets?: readonly AdmittedTarget[];
};

const nonLiteralTarget =
  /\b(?:INSERT\s+(?:OR\s+\w+\s+)?INTO|REPLACE\s+INTO|UPDATE(?:\s+OR\s+\w+)?|DELETE\s+FROM|DROP\s+TABLE(?:\s+IF\s+EXISTS)?|ALTER\s+TABLE|CREATE\s+(?:TEMP\s+|TEMPORARY\s+|VIRTUAL\s+)?TABLE(?:\s+IF\s+NOT\s+EXISTS)?|INDEX\s+(?:IF\s+NOT\s+EXISTS\s+)?\w+\s+ON)\s*["`[]?(?:\$\{\s*([^}]+?)\s*\}|['"`]\s*\+\s*([\w$.]+))/gi;

export function nonLiteralTargetsIn(text: string): readonly string[] {
  const expressions = new Set<string>();
  for (const match of text.matchAll(nonLiteralTarget)) {
    const expression = match[1] ?? match[2];
    if (expression !== undefined) {
      expressions.add(expression);
    }
  }
  return [...expressions];
}

function inFolder(path: string, claim: OwnsClaim): boolean {
  return path === claim.folder || path.startsWith(`${claim.folder}/`);
}

function targetKey(path: string, expression: string): string {
  return JSON.stringify([path, expression]);
}

function nonLiteralFindings(input: OwnershipInput, ownerOf: ReadonlyMap<string, OwnsClaim>): string[] {
  const find = input.nonLiteralTargetsIn;
  if (find === undefined) {
    return [];
  }
  const admitted = input.admittedTargets ?? [];
  const seen = new Set<string>();
  const findings: string[] = [];
  for (const source of input.sources) {
    for (const expression of find(source.text)) {
      seen.add(targetKey(source.path, expression));
      if (!admitted.some((entry) => entry.path === source.path && entry.expression === expression)) {
        findings.push(
          `${source.path} writes a table named by ${expression}, not a literal; write the table name in the SQL, or admit the expression with the tables it ranges over in scripts/checks/owns.check.ts`,
        );
      }
    }
  }
  for (const entry of admitted) {
    if (!seen.has(targetKey(entry.path, entry.expression))) {
      findings.push(
        `${entry.path} no longer names a table by ${entry.expression}; remove its entry from scripts/checks/owns.check.ts`,
      );
      continue;
    }
    for (const table of entry.tables) {
      const owner = ownerOf.get(table);
      if (owner === undefined) {
        findings.push(`${entry.path} writes ${table} (through ${entry.expression}), which no one owns`);
      } else if (!inFolder(entry.path, owner)) {
        findings.push(
          `${entry.path} writes ${table} (through ${entry.expression}), which ${owner.owner} owns in ${owner.folder}`,
        );
      }
    }
  }
  return findings;
}

function twice(claims: readonly OwnsClaim[], field: 'tables' | 'directories' | 'keys'): string[] {
  const owners = new Map<string, string>();
  const findings: string[] = [];
  for (const claim of claims) {
    for (const value of claim[field]) {
      const earlier = owners.get(value);
      if (earlier !== undefined) {
        findings.push(`${field.slice(0, -1)} ${value} is claimed by ${earlier} and ${claim.owner}`);
      } else {
        owners.set(value, claim.owner);
      }
    }
  }
  return findings;
}

function nested(claims: readonly OwnsClaim[]): string[] {
  const directories = claims.flatMap((claim) => claim.directories.map((directory) => ({ directory, claim })));
  return directories.flatMap(({ directory, claim }) =>
    directories
      .filter((other) => other.claim.owner !== claim.owner && other.directory.startsWith(`${directory}/`))
      .map(
        (other) =>
          `directory ${other.directory} of ${other.claim.owner} lies inside ${directory} of ${claim.owner}`,
      ),
  );
}

export function ownershipFindings(input: OwnershipInput): string[] {
  const findings = [
    ...twice(input.claims, 'tables'),
    ...twice(input.claims, 'directories'),
    ...twice(input.claims, 'keys'),
  ];
  findings.push(...nested(input.claims));
  const ownerOf = new Map(
    input.claims.flatMap((claim) => claim.tables.map((table) => [table, claim] as const)),
  );
  for (const table of input.createdTables) {
    if (!ownerOf.has(table)) {
      findings.push(`table ${table} is created by a migration and owned by no one`);
    }
  }
  for (const source of input.sources) {
    for (const table of input.tablesWrittenIn(source.text)) {
      const owner = ownerOf.get(table);
      if (owner === undefined) {
        findings.push(`${source.path} writes ${table}, which no one owns`);
      } else if (!inFolder(source.path, owner)) {
        findings.push(`${source.path} writes ${table}, which ${owner.owner} owns in ${owner.folder}`);
      }
    }
  }
  findings.push(...nonLiteralFindings(input, ownerOf));
  return findings;
}

const copyTableFolders: readonly string[] = ['src/lib/strings'];

export function writerSources(sources: readonly SourceText[]): SourceText[] {
  return sources.filter((source) => !copyTableFolders.some((folder) => source.path.startsWith(`${folder}/`)));
}
