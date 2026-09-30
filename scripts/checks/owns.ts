export type OwnsClaim = {
  owner: string;
  folder: string;
  tables: readonly string[];
  directories: readonly string[];
  keys: readonly string[];
};

export type SourceText = { path: string; text: string };

export type OwnershipInput = {
  claims: readonly OwnsClaim[];
  createdTables: readonly string[];
  sources: readonly SourceText[];
  tablesWrittenIn(text: string): readonly string[];
};

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
      } else if (!(source.path === owner.folder || source.path.startsWith(`${owner.folder}/`))) {
        findings.push(`${source.path} writes ${table}, which ${owner.owner} owns in ${owner.folder}`);
      }
    }
  }
  return findings;
}

const copyTableFolders: readonly string[] = ['src/lib/strings'];

export function writerSources(sources: readonly SourceText[]): SourceText[] {
  return sources.filter((source) => !copyTableFolders.some((folder) => source.path.startsWith(`${folder}/`)));
}
