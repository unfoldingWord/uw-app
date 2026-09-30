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
    ['migrations/0002-groups.ts', "import { createKernel } from '@lib/kernel';\n"],
    ['migrations/0002-groups.ts', "import { allowedHosts } from '@lib/network';\n"],
    ['migrations/0002-groups.ts', "import { migrationsTable } from '@lib/ports';\n"],
    ['src/features/home/migrations/0001-home.ts', "import { home } from '../service';\n"],
    ['src/features/home/service.ts', "import { File } from 'expo-file-system';\n"],
    ['src/features/home/service.ts', "import { openDatabaseSync } from 'expo-sqlite';\n"],
    ['src/features/home/service.ts', "import { BlurView } from 'expo-blur';\n"],
    ['src/features/home/screens/HomeScreen.tsx', "import { shareAsync } from 'expo-sharing';\n"],
    ['src/shared/theme/theme.ts', "import { createAudioPlayer } from 'expo-audio';\n"],
    ['src/shared/theme/theme.ts', "import { getLocales } from 'expo-localization';\n"],
    ['src/shared/theme/theme.ts', "import { BlurView } from 'expo-blur';\n"],
    ['src/shared/theme/theme.ts', "import font from '@design-system/assets/fonts/Inter-Regular.ttf';\n"],
    ['src/shared/fonts/assets.ts', "import tokens from '@design-system/tokens/colors.css';\n"],
    ['src/lib/corpus/corpus.ts', "import font from '@design-system/assets/fonts/Inter-Regular.ttf';\n"],
    ['src/shared/ui/Row.tsx', "import logo from '@design-system/assets/logo/logo-horizontal-color.png';\n"],
    ['src/shared/ui/Logo.tsx', "import mark from '@design-system/assets/logo/logo-mark-color.png';\n"],
    ['src/shared/ui/Logo.tsx', "import font from '@design-system/assets/fonts/Inter-Regular.ttf';\n"],
    ['src/shared/ui/Logo.tsx', "import { BlurView } from 'expo-blur';\n"],
    ['app/index.tsx', "import { createKernel } from '@lib/kernel';\n"],
    ['app/index.tsx', "import { home } from '@features/home/service';\n"],
    ['app/index.tsx', "import { files } from '@platform/files';\n"],
    ['app/(tabs)/_layout.tsx', "import { createKernel } from '@lib/kernel';\n"],
    ['app/(tabs)/_layout.tsx', "import { files } from '@platform/files';\n"],
    ['app/_layout.tsx', "import { File } from 'expo-file-system';\n"],
    ['app/_layout.tsx', "import type { Ports } from '@lib/ports';\n"],
    ['app/_layout.tsx', "import { allowedHosts } from '@lib/network-extra';\n"],
    ['app/_layout.tsx', "import { isAllowedUrl } from '@lib/network';\n"],
    ['app/_layout.tsx', "import { bookmarks } from '@features/home/store';\n"],
    ['src/lib/corpus/corpus.ts', "import { backupExclusionModule } from '@modules/backup-exclusion';\n"],
    ['src/features/home/service.ts', "import { backupExclusionModule } from '@modules/backup-exclusion';\n"],
    ['src/shared/theme/theme.ts', "import { backupExclusionModule } from '@modules/backup-exclusion';\n"],
    ['app/_layout.tsx', "import { backupExclusionModule } from '@modules/backup-exclusion';\n"],
    ['sim/world.ts', "import { backupExclusionModule } from '@modules/backup-exclusion';\n"],
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
    ['src/lib/corpus/corpus.ts', "import { home } from '@lib/../features/home/service';\n"],
    ['src/features/home/service.ts', "import { study } from '@features/home/../study/service';\n"],
    ['src/features/home/screens/HomeScreen.tsx', "import { kernel } from '@lib/domain/../kernel';\n"],
    ['src/shared/theme/theme.ts', "export * from '@shared/./../features/home/service';\n"],
    ['app/index.tsx', "export { default } from '@features/home/screens/../store';\n"],
    ['sim/world.ts', "import { files } from '@lib/../platform/files';\n"],
  ])('%s refuses the relative path %s', async (file, code) => {
    expect(await ruleIds(file, code)).toContain(leavesUnit);
  });

  it.each([
    ['src/lib/kernel.ts', "import { journal } from './journal/journal';\n"],
    ['src/features/home/service.ts', "import type { Kernel } from '@lib/kernel';\n"],
    ['src/features/home/screens/HomeScreen.tsx', "import { home } from '../service';\n"],
    ['src/features/home/screens/HomeScreen.tsx', "import type { Reference } from '@lib/domain/reference';\n"],
    ['src/platform/files.ts', "import type { Files } from '@lib/ports';\n"],
    ['src/platform/ports.ts', "import { backupExclusionModule } from '@modules/backup-exclusion';\n"],
    ['sim/world.ts', "import { createKernel } from '@lib/kernel';\n"],
    ['sim/world.ts', "import { home } from '@features/home/service';\n"],
    ['sim/world.ts', "import { readFileSync } from 'node:fs';\n"],
    ['migrations/0002-groups.ts', "import type { Migration } from '@lib/ports';\n"],
    ['src/features/home/migrations/0001-home.ts', "import type { Migration } from '@lib/ports';\n"],
    ['src/shared/glass/GlassSurface.tsx', "import { BlurView } from 'expo-blur';\n"],
    ['src/shared/fonts/assets.ts', "import font from '@design-system/assets/fonts/Inter-Regular.ttf';\n"],
    [
      'src/shared/ui/Logo.tsx',
      "import logo from '@design-system/assets/logo/logo-horizontal-reversed.png';\n",
    ],
    ['app/index.tsx', "export { default } from '@features/home/screens/HomeScreen';\n"],
    ['app/(tabs)/_layout.tsx', "import { Tabs } from 'expo-router';\n"],
    ['app/_layout.tsx', "import { createKernel } from '@lib/kernel';\n"],
    ['app/_layout.tsx', "import { platformPorts } from '@platform/ports';\n"],
    ['app/_layout.tsx', "import { isAllowedUrl } from '@lib/kernel';\n"],
    ['app/_layout.tsx', "import { createSettingsService } from '@features/settings/service';\n"],
    ['app/_layout.tsx', "import { GlassSurface } from '@shared/glass';\n"],
    ['src/platform/files.ts', "import { File } from 'expo-file-system';\n"],
    ['src/lib/burrito/files.ts', "import { md5 } from '@noble/hashes/legacy.js';\n"],
  ])('%s allows %s', async (file, code) => {
    const ids = await ruleIds(file, code);
    expect(ids.filter((id) => id === restricted || id === leavesUnit)).toEqual([]);
  });
});

describe('static imports only (AGENTS.md rule 2)', () => {
  it.each([
    ['src/lib/corpus/corpus.ts', "export const load = () => import('@features/home/service');\n"],
    ['src/features/home/service.ts', "export const load = () => import('expo-file-system');\n"],
    ['src/shared/theme/theme.ts', 'export const load = (name: string) => import(name);\n'],
    ['app/index.tsx', "export const load = () => import('@lib/kernel');\n"],
    ['migrations/0002-groups.ts', "export const load = () => import('@lib/kernel');\n"],
    ['src/features/home/service.ts', "export const files = require('expo-file-system');\n"],
    ['src/features/home/service.ts', "export type Home = import('@features/study/service').Study;\n"],
  ])('%s refuses %s', async (file, code) => {
    expect(await ruleIds(file, code)).toContain('no-restricted-syntax');
  });

  it('lets the sim and scripts discover files by path', async () => {
    const ids = await ruleIds('sim/scenario.ts', 'export const load = (path: string) => import(path);\n');
    expect(ids).not.toContain('no-restricted-syntax');
  });
});

describe('network only through the Http port (AGENTS.md section 10)', () => {
  it.each([
    ['src/features/home/service.ts', "export const get = () => fetch('https://example.org');\n"],
    ['src/shared/theme/theme.ts', 'export const x = new XMLHttpRequest();\n'],
    ['app/index.tsx', "export const s = new WebSocket('wss://example.org');\n"],
  ])('%s refuses %s', async (file, code) => {
    expect(await ruleIds(file, code)).toContain('no-restricted-globals');
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
    "export const day = () => new Intl.DateTimeFormat('en').format(0);\n",
    'export const sort = (a: string, b: string) => new Intl.Collator().compare(a, b);\n',
    'export const intl = Intl;\n',
    "export const zone = Intl['DateTimeFormat'];\n",
    'export const order = (a: string, b: string) => a.localeCompare(b);\n',
    'export const shown = (n: number) => n.toLocaleString();\n',
    "export const host = Function('return this')();\n",
    "export const host = (0, eval)('this');\n",
    'export const later = (work: () => void) => queueMicrotask(work);\n',
    'export const where = import.meta.url;\n',
    'const m = Math;\nexport const roll = () => m.random();\n',
    'const { random } = Math;\nexport const roll = () => random();\n',
    "export const roll = () => Math['random']();\n",
    'export const ref = new WeakRef({});\n',
    'export const plural = (locale: string, n: number) => new Intl.PluralRules(locale).select(n);\n',
    'export const rules = (locale: string): Intl.PluralRules => new Intl.PluralRules(locale);\n',
  ])('src/lib refuses %s', async (code) => {
    const ids = await ruleIds('src/lib/clock.ts', code);
    expect(
      ids.some((id) =>
        [
          'no-restricted-globals',
          'no-restricted-properties',
          'no-restricted-syntax',
          'no-eval',
          'no-new-func',
          'no-implied-eval',
        ].includes(id),
      ),
    ).toBe(true);
  });

  it.each(['export const floor = (n: number) => Math.floor(n);\n'])('src/lib allows %s', async (code) => {
    expect(await ruleIds('src/lib/clock.ts', code)).toEqual([]);
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

  it.each(['src/lib/a.mts', 'sim/a.cts', 'app/a.jsx'])('reaches %s', async (file) => {
    expect(await ruleIds(file, 'export const a = 1;\n// why\n')).toContain('uw/no-comments');
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
