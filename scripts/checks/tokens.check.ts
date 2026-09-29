import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { Check, CheckOutcome } from './check.ts';
import { compareRecords, parseTokenCss, type FontFaceDeclaration } from './css-tokens.ts';

const repositoryRoot = join(import.meta.dirname, '..', '..');
const tokensDirectory = join(repositoryRoot, 'design-system', 'tokens');
const themeMirror = join(repositoryRoot, 'src', 'shared', 'theme', 'tokens.ts');
const fontMirror = join(repositoryRoot, 'src', 'shared', 'fonts', 'faces.ts');
const fontDirectory = join(repositoryRoot, 'design-system', 'assets', 'fonts');

type Mirror = {
  rootTokens: Record<string, string>;
  darkTokens: Record<string, string>;
  reducedMotionTokens: Record<string, string>;
  keyframes: Record<string, string>;
};

function isStringRecord(value: unknown): value is Record<string, string> {
  return (
    typeof value === 'object' &&
    value !== null &&
    Object.values(value).every((entry) => typeof entry === 'string')
  );
}

async function loadModule(path: string): Promise<Record<string, unknown>> {
  const loaded: Record<string, unknown> = await import(pathToFileURL(path).href);
  return loaded;
}

async function loadMirror(): Promise<Mirror | string> {
  const loaded = await loadModule(themeMirror);
  const names = ['rootTokens', 'darkTokens', 'reducedMotionTokens', 'keyframes'] as const;
  const records: Partial<Mirror> = {};
  for (const name of names) {
    const value = loaded[name];
    if (!isStringRecord(value)) {
      return `src/shared/theme/tokens.ts must export ${name} as a record of strings`;
    }
    records[name] = value;
  }
  return records as Mirror;
}

function faceKey(face: Partial<FontFaceDeclaration>): string {
  const parts = [
    face.family,
    face.file,
    `weight ${face.weight ?? ''}`,
    `style ${face.style ?? ''}`,
    face.stretch === undefined ? undefined : `stretch ${face.stretch}`,
    face.unicodeRange === undefined ? undefined : `unicode-range ${face.unicodeRange}`,
  ];
  return parts.filter((part) => part !== undefined).join(', ');
}

async function loadFaceKeys(): Promise<string[] | string> {
  const loaded = await loadModule(fontMirror);
  const faces = loaded['fontFaces'];
  if (!Array.isArray(faces)) {
    return 'src/shared/fonts/faces.ts must export fontFaces as an array';
  }
  return faces.map((face: Partial<FontFaceDeclaration>) => faceKey(face));
}

function describe(scope: string, expected: Record<string, string>, actual: Record<string, string>): string[] {
  const { missing, extra, mismatched } = compareRecords(expected, actual);
  return [
    ...missing.map((name) => `${scope}: missing ${name}`),
    ...extra.map((name) => `${scope}: extra ${name}, not in design-system/tokens`),
    ...mismatched.map((line) => `${scope}: ${line}`),
  ];
}

async function run(): Promise<CheckOutcome> {
  const files = readdirSync(tokensDirectory)
    .filter((file) => file.endsWith('.css'))
    .sort()
    .map((file) => readFileSync(join(tokensDirectory, file), 'utf8'));
  const css = parseTokenCss(files);
  const mirror = await loadMirror();
  const faceKeys = await loadFaceKeys();
  if (typeof mirror === 'string') {
    return { status: 'fail', findings: [mirror] };
  }
  if (typeof faceKeys === 'string') {
    return { status: 'fail', findings: [faceKeys] };
  }
  const cssFaceKeys = css.fontFaces.map(faceKey);
  const shippedFiles = readdirSync(fontDirectory);
  const missingFiles = css.fontFaces
    .map((face) => face.file)
    .filter((file) => !shippedFiles.includes(file))
    .map((file) => `@font-face: ${file} is not in design-system/assets/fonts`);
  const findings = [
    ...describe(':root', css.root, mirror.rootTokens),
    ...describe('[data-theme="dark"]', css.dark, mirror.darkTokens),
    ...describe('prefers-reduced-motion', css.reducedMotion, mirror.reducedMotionTokens),
    ...describe('@keyframes', css.keyframes, mirror.keyframes),
    ...cssFaceKeys.filter((key) => !faceKeys.includes(key)).map((key) => `@font-face: missing ${key}`),
    ...faceKeys
      .filter((key) => !cssFaceKeys.includes(key))
      .map((key) => `@font-face: extra ${key}, not in design-system/tokens/fonts.css`),
    ...missingFiles,
  ];
  if (findings.length > 0) {
    return { status: 'fail', findings };
  }
  const counts = [
    Object.keys(css.root).length,
    Object.keys(css.dark).length,
    Object.keys(css.reducedMotion).length,
    Object.keys(css.keyframes).length,
    css.fontFaces.length,
  ];
  return {
    status: 'pass',
    summary: `${counts[0]} tokens, ${counts[1]} dark overrides, ${counts[2]} reduced-motion overrides, ${counts[3]} keyframes and ${counts[4]} font faces agree`,
  };
}

const check: Check = {
  name: 'tokens',
  rule: 'src/shared/theme and src/shared/fonts agree with design-system/tokens/*.css by name and value',
  run,
};

export default check;
