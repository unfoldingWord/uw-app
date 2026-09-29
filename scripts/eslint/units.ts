import { relative, sep } from 'node:path';

const topLevelUnits = ['app', 'sim', 'scripts', 'tests', 'migrations'];
const sourceUnits = ['lib', 'shared', 'platform'];

export function unitOf(repositoryRoot: string, file: string): string | undefined {
  const parts = relative(repositoryRoot, file).split(sep);
  const [first, second, third] = parts;
  if (first === undefined || first === '..') {
    return undefined;
  }
  if (topLevelUnits.includes(first) && parts.length > 1) {
    return first;
  }
  if (first !== 'src' || second === undefined) {
    return undefined;
  }
  if (sourceUnits.includes(second)) {
    return ['src', second].join('/');
  }
  if (second === 'features' && third !== undefined && parts.length > 3) {
    return ['src', 'features', third].join('/');
  }
  return undefined;
}
