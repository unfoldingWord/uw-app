import { describe, expect, it } from 'vitest';
import {
  dynamicPart,
  missingRouteFindings,
  pushedTargets,
  reExportFindings,
  routeMatches,
  routeOf,
  type Route,
} from './routes.ts';

function routesOf(files: readonly string[]): Route[] {
  return files.map(routeOf).filter((route): route is Route => route !== undefined);
}

describe('routeOf', () => {
  it('drops groups, index and layouts and keeps dynamic segments', () => {
    expect(
      routesOf(['app/(tabs)/index.tsx', 'app/(tabs)/_layout.tsx', 'app/_layout.tsx']).map(
        (route) => route.pattern,
      ),
    ).toEqual(['/']);
    expect(routeOf('app/study/article/[...id].tsx')?.segments).toEqual([
      { kind: 'literal', name: 'study' },
      { kind: 'literal', name: 'article' },
      { kind: 'catchAll' },
    ]);
  });
});

describe('pushedTargets', () => {
  it('reads quoted routes and template routes with their expressions as dynamic parts', () => {
    const text = [
      "router.push('/transfer');",
      "const link = 'https://unfoldingword.org/Give';",
      "id.split('/').join('/');",
      "router.push(`/study/article/${id.split('/').map(encodeURIComponent).join('/')}`);",
      "router.push({ pathname: '/share', params: { kind: 'story' } });",
    ].join('\n');
    expect(pushedTargets({ path: 'src/features/x/screens/X.tsx', text }).map((item) => item.target)).toEqual([
      '/transfer',
      '/share',
      `/study/article/${dynamicPart}`,
    ]);
  });
});

describe('routeMatches and missingRouteFindings', () => {
  const routes = routesOf([
    'app/(tabs)/index.tsx',
    'app/(tabs)/study.tsx',
    'app/study/story/[number].tsx',
    'app/study/article/[...id].tsx',
    'app/formation/session/[track]/[number].tsx',
  ]);

  it('matches literal, dynamic and catch-all segments and ignores the query', () => {
    const [home, study, story, article, session] = routes;
    expect(home !== undefined && routeMatches('/', home)).toBe(true);
    expect(study !== undefined && routeMatches('/study?bookmark=1', study)).toBe(true);
    expect(story !== undefined && routeMatches(`/study/story/${dynamicPart}`, story)).toBe(true);
    expect(article !== undefined && routeMatches('/study/article/tw/bible/kt/god', article)).toBe(true);
    expect(
      session !== undefined && routeMatches(`/formation/session/${dynamicPart}/${dynamicPart}`, session),
    ).toBe(true);
    expect(story !== undefined && routeMatches('/study/story', story)).toBe(false);
  });

  it('names a navigation target no route serves', () => {
    expect(
      missingRouteFindings(
        [
          { file: 'a.tsx', target: '/study' },
          { file: 'b.tsx', target: '/transfer' },
        ],
        routes,
      ),
    ).toEqual(['b.tsx navigates to /transfer, which no route file under app/ serves']);
  });
});

describe('reExportFindings', () => {
  it('accepts a one-line re-export of an existing screen and names anything else', () => {
    const exists = (feature: string, screen: string) => feature === 'share' && screen === 'ShareScreen';
    expect(
      reExportFindings(
        [
          { path: 'app/_layout.tsx', text: 'export default function RootLayout() {}' },
          { path: 'app/share.tsx', text: "export { default } from '@features/share/screens/ShareScreen';\n" },
          { path: 'app/ghost.tsx', text: "export { default } from '@features/ghost/screens/GhostScreen';\n" },
          { path: 'app/inline.tsx', text: 'export default function Inline() { return null; }\n' },
        ],
        exists,
      ),
    ).toEqual([
      'app/ghost.tsx re-exports src/features/ghost/screens/GhostScreen.tsx, which has no default export',
      "app/inline.tsx is not a one-line re-export of a feature screen (export { default } from '@features/<name>/screens/<Screen>';)",
    ]);
  });
});
