export type SourceFile = { readonly path: string; readonly text: string };

export type RouteSegment =
  | { readonly kind: 'literal'; readonly name: string }
  | { readonly kind: 'dynamic' }
  | { readonly kind: 'catchAll' };

export type Route = {
  readonly file: string;
  readonly pattern: string;
  readonly segments: readonly RouteSegment[];
};

export type PushedTarget = { readonly file: string; readonly target: string };

export const dynamicPart = ':dynamic';

const routeFile = /^app\/(.+)\.tsx$/;
const layoutName = '_layout';
const groupSegment = /^\(.+\)$/;
const catchAllSegment = /^\[\.\.\..+\]$/;
const dynamicSegment = /^\[.+\]$/;
const reExport =
  /^export \{ default \} from '@features\/([a-z][A-Za-z0-9-]*)\/screens\/([A-Z][A-Za-z0-9]*)';\n?$/;
const quotedRoute = /(['"])(\/[A-Za-z][^'"\s]*)\1/g;

export const rootLayout = 'app/_layout.tsx';

function segmentOf(part: string): RouteSegment {
  if (catchAllSegment.test(part)) {
    return { kind: 'catchAll' };
  }
  if (dynamicSegment.test(part)) {
    return { kind: 'dynamic' };
  }
  return { kind: 'literal', name: part };
}

export function routeOf(file: string): Route | undefined {
  const matched = routeFile.exec(file);
  if (matched?.[1] === undefined) {
    return undefined;
  }
  const parts = matched[1].split('/');
  if (parts[parts.length - 1] === layoutName) {
    return undefined;
  }
  const kept = parts.filter((part) => !groupSegment.test(part) && part !== 'index');
  return { file, pattern: `/${kept.join('/')}`, segments: kept.map(segmentOf) };
}

export function reExportFindings(
  files: readonly SourceFile[],
  screenExists: (feature: string, screen: string) => boolean,
): string[] {
  const findings: string[] = [];
  for (const file of files) {
    if (file.path === rootLayout || !routeFile.test(file.path)) {
      continue;
    }
    const matched = reExport.exec(file.text);
    if (matched?.[1] === undefined || matched[2] === undefined) {
      findings.push(
        `${file.path} is not a one-line re-export of a feature screen (export { default } from '@features/<name>/screens/<Screen>';)`,
      );
      continue;
    }
    if (!screenExists(matched[1], matched[2])) {
      findings.push(
        `${file.path} re-exports src/features/${matched[1]}/screens/${matched[2]}.tsx, which has no default export`,
      );
    }
  }
  return findings;
}

function templateEnd(text: string, start: number): { body: string; end: number } | undefined {
  let body = '';
  let index = start;
  while (index < text.length) {
    const char = text[index];
    if (char === '`') {
      return { body, end: index };
    }
    if (char === '\\') {
      body += text.slice(index, index + 2);
      index += 2;
      continue;
    }
    if (char === '$' && text[index + 1] === '{') {
      let depth = 1;
      index += 2;
      while (index < text.length && depth > 0) {
        if (text[index] === '{') {
          depth += 1;
        } else if (text[index] === '}') {
          depth -= 1;
        }
        index += 1;
      }
      body += dynamicPart;
      continue;
    }
    body += char;
    index += 1;
  }
  return undefined;
}

export function pushedTargets(file: SourceFile): PushedTarget[] {
  const targets: PushedTarget[] = [];
  for (const match of file.text.matchAll(quotedRoute)) {
    if (match[2] !== undefined) {
      targets.push({ file: file.path, target: match[2] });
    }
  }
  let index = file.text.indexOf('`/');
  while (index !== -1) {
    const found = templateEnd(file.text, index + 1);
    if (found === undefined) {
      break;
    }
    if (/^\/[A-Za-z]/.test(found.body)) {
      targets.push({ file: file.path, target: found.body });
    }
    index = file.text.indexOf('`/', found.end + 1);
  }
  return targets;
}

function pathOf(target: string): string[] {
  const [path = ''] = target.split(/[?#]/);
  return path.split('/').filter((part) => part !== '');
}

function matchesFrom(parts: readonly string[], segments: readonly RouteSegment[]): boolean {
  const [segment, ...rest] = segments;
  if (segment === undefined) {
    return parts.length === 0;
  }
  const [part, ...others] = parts;
  if (part === undefined) {
    return false;
  }
  switch (segment.kind) {
    case 'catchAll':
      return rest.length === 0;
    case 'dynamic':
      return matchesFrom(others, rest);
    case 'literal':
      return (part === segment.name || part === dynamicPart) && matchesFrom(others, rest);
  }
}

export function routeMatches(target: string, route: Route): boolean {
  return matchesFrom(pathOf(target), route.segments);
}

export function missingRouteFindings(targets: readonly PushedTarget[], routes: readonly Route[]): string[] {
  return targets
    .filter((pushed) => !routes.some((route) => routeMatches(pushed.target, route)))
    .map((pushed) => `${pushed.file} navigates to ${pushed.target}, which no route file under app/ serves`);
}
