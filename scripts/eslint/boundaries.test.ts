import { ESLint } from 'eslint';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const repositoryRoot = join(import.meta.dirname, '..', '..');
const eslint = new ESLint({ cwd: repositoryRoot });

async function ruleIds(file: string, code: string): Promise<string[]> {
  const [result] = await eslint.lintText(code, { filePath: join(repositoryRoot, file) });
  return (result?.messages ?? []).map((message) => message.ruleId ?? 'fatal');
}

const restricted = '@typescript-eslint/no-restricted-imports';
const leavesUnit = 'uw/relative-imports-stay-in-unit';

describe('import boundaries (AGENTS.md rule 2)', () => {
  it.each([
    ['src/lib/corpus/corpus.ts', "import { View } from 'react-native';\n"],
    ['src/lib/corpus/corpus.ts', "import { useState } from 'react';\n"],
    ['src/lib/corpus/corpus.ts', "import { File } from 'expo-file-system';\n"],
    ['src/lib/corpus/corpus.ts', "import { readFile } from 'node:fs/promises';\n"],
    ['src/lib/corpus/corpus.ts', "import { home } from '@features/home/service';\n"],
    ['src/lib/corpus/corpus.ts', "import { theme } from '@shared/theme/theme';\n"],
    ['src/lib/corpus/corpus.ts', "import { http } from '@platform/http';\n"],
    ['src/features/home/service.ts', "import { study } from '@features/study/service';\n"],
    ['src/features/home/service.ts', "import { http } from '@platform/http';\n"],
    ['src/features/home/screens/HomeScreen.tsx', "import { createKernel } from '@lib/kernel';\n"],
    ['src/features/home/screens/HomeScreen.tsx', "import type { Ports } from '@lib/ports';\n"],
    ['src/features/home/screens/HomeScreen.tsx', "import { bookmarks } from '../store';\n"],
    ['src/shared/theme/theme.ts', "import { home } from '@features/home/service';\n"],
    ['src/platform/files.ts', "import { createKernel } from '@lib/kernel';\n"],
    ['src/platform/files.ts', "import { failureCodes } from '@lib/domain/failures';\n"],
    ['src/platform/files.ts', "import { theme } from '@shared/theme/theme';\n"],
    ['sim/world.ts', "import { bookmarks } from '@features/home/store';\n"],
    ['sim/world.ts', "import { http } from '@platform/http';\n"],
    ['sim/world.ts', "import { View } from 'react-native';\n"],
    ['app/index.tsx', "import { createWorld } from '@sim/world';\n"],
  ])('%s refuses %s', async (file, code) => {
    expect(await ruleIds(file, code)).toContain(restricted);
  });

  it.each([
    ['src/lib/corpus/corpus.ts', "import { home } from '../../features/home/service';\n"],
    ['src/features/home/service.ts', "import { study } from '../study/service';\n"],
    ['src/features/home/screens/HomeScreen.tsx', "import { createKernel } from '../../../lib/kernel';\n"],
    ['src/shared/theme/theme.ts', "export { home } from '../../features/home/service';\n"],
    ['src/platform/files.ts', "import { createKernel } from '../lib/kernel';\n"],
    ['sim/world.ts', "import { bookmarks } from '../src/features/home/store';\n"],
  ])('%s refuses the relative path %s', async (file, code) => {
    expect(await ruleIds(file, code)).toContain(leavesUnit);
  });

  it.each([
    ['src/lib/kernel.ts', "import { journal } from './journal/journal';\n"],
    ['src/features/home/service.ts', "import type { Kernel } from '@lib/kernel';\n"],
    ['src/features/home/screens/HomeScreen.tsx', "import { home } from '../service';\n"],
    ['src/features/home/screens/HomeScreen.tsx', "import type { Reference } from '@lib/domain/reference';\n"],
    ['src/platform/files.ts', "import type { Files } from '@lib/ports';\n"],
    ['sim/world.ts', "import { createKernel } from '@lib/kernel';\n"],
    ['sim/world.ts', "import { home } from '@features/home/service';\n"],
    ['sim/world.ts', "import { readFileSync } from 'node:fs';\n"],
  ])('%s allows %s', async (file, code) => {
    const ids = await ruleIds(file, code);
    expect(ids.filter((id) => id === restricted || id === leavesUnit)).toEqual([]);
  });
});

describe('lib purity (AGENTS.md rule 2)', () => {
  it.each([
    'export const now = () => Date.now();\n',
    'export const roll = () => Math.random();\n',
    "export const get = () => fetch('https://example.org');\n",
    'export const id = () => crypto.randomUUID();\n',
    'export const title = () => document.title;\n',
    "export const say = () => console.log('x');\n",
  ])('src/lib refuses %s', async (code) => {
    const ids = await ruleIds('src/lib/clock.ts', code);
    expect(ids.some((id) => id === 'no-restricted-globals' || id === 'no-restricted-properties')).toBe(true);
  });
});

describe('code carries no comments (AGENTS.md section 10)', () => {
  it.each([
    'export const a = 1;\n// why\n',
    '/** docs */\nexport const a = 1;\n',
    '// @ts-ignore\nexport const a: number = 1;\n',
  ])('refuses %j', async (code) => {
    expect(await ruleIds('src/lib/a.ts', code)).toContain('uw/no-comments');
  });

  it('cannot be switched off inline', async () => {
    const ids = await ruleIds('scripts/a.ts', '/* eslint-disable */\nexport const a = 1;\n');
    expect(ids).toContain('uw/no-comments');
  });
});

describe('types and size', () => {
  it('refuses any', async () => {
    expect(await ruleIds('src/lib/a.ts', 'export const a = (x: any) => x;\n')).toContain(
      '@typescript-eslint/no-explicit-any',
    );
  });

  it('refuses a file of 1000 lines', async () => {
    const code = Array.from({ length: 1000 }, (_, index) => `export const a${index} = ${index};`).join('\n');
    expect(await ruleIds('src/lib/a.ts', code)).toContain('max-lines');
  });
});
