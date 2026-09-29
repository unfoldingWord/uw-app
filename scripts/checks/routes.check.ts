import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import type { Check } from './check.ts';
import {
  missingRouteFindings,
  pushedTargets,
  reExportFindings,
  routeOf,
  type Route,
  type SourceFile,
} from './routes.ts';

const repositoryRoot = join(import.meta.dirname, '..', '..');

const navigatingRoots: readonly string[] = ['app', join('src', 'features'), join('src', 'shared')];

const sourceFile = /\.tsx?$/;
const testFile = /\.test\.tsx?$/;

function sourcesUnder(directory: string): SourceFile[] {
  const absolute = join(repositoryRoot, directory);
  if (!existsSync(absolute)) {
    return [];
  }
  return readdirSync(absolute, { withFileTypes: true, recursive: true })
    .filter((entry) => entry.isFile() && sourceFile.test(entry.name) && !testFile.test(entry.name))
    .map((entry) => relative(repositoryRoot, join(entry.parentPath, entry.name)).split(sep).join('/'))
    .sort()
    .map((path) => ({ path, text: readFileSync(join(repositoryRoot, path), 'utf8') }));
}

function screenExists(feature: string, screen: string): boolean {
  const path = join(repositoryRoot, 'src', 'features', feature, 'screens', `${screen}.tsx`);
  return existsSync(path) && /export default /.test(readFileSync(path, 'utf8'));
}

const check: Check = {
  name: 'routes',
  rule: 'Every route file under app/ is a one-line re-export of an existing feature screen, and every route a screen navigates to is served by a route file',
  run() {
    const appFiles = sourcesUnder('app');
    const routes = appFiles
      .map((file) => routeOf(file.path))
      .filter((route): route is Route => route !== undefined);
    const targets = navigatingRoots.flatMap(sourcesUnder).flatMap(pushedTargets);
    const findings = [...reExportFindings(appFiles, screenExists), ...missingRouteFindings(targets, routes)];
    if (findings.length > 0) {
      return { status: 'fail', findings };
    }
    return {
      status: 'pass',
      summary: `${routes.length} routes, each a re-export of a feature screen; ${targets.length} navigation targets, each served`,
    };
  },
};

export default check;
