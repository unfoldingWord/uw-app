import { relative, sep } from 'node:path';

export const nativeForbiddenRoots: readonly string[] = [
  'sim/',
  'scripts/',
  'node_modules/sql.js/',
  'node_modules/react-native-web/',
];

export function repositoryPath(repositoryRoot: string, source: string): string {
  const bare = source.replace(/^file:\/\//, '');
  const path = bare.startsWith('/') ? relative(repositoryRoot, bare) : bare;
  return path
    .split(sep)
    .join('/')
    .replace(/^(\.\.\/)+/, '');
}

export function forbiddenSources(repositoryRoot: string, sources: readonly string[]): string[] {
  const found = new Set<string>();
  for (const source of sources) {
    const path = repositoryPath(repositoryRoot, source);
    if (nativeForbiddenRoots.some((root) => path.startsWith(root))) {
      found.add(path);
    }
  }
  return [...found].sort();
}
