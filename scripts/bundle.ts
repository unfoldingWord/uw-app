import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { localeGateFindings, localeGateFlag } from './bundle/locale-gate';
import { forbiddenSources } from './bundle/sources';

const repositoryRoot = join(import.meta.dirname, '..');
const rootLayout = join(repositoryRoot, 'app', '_layout.tsx');
const platforms = ['android', 'ios'];

type SourceMap = { sources?: unknown };

function mapSources(output: string): string[] {
  const sources: string[] = [];
  for (const entry of readdirSync(output, { recursive: true, withFileTypes: true })) {
    if (entry.isFile() && entry.name.endsWith('.map')) {
      const map = JSON.parse(readFileSync(join(entry.parentPath, entry.name), 'utf8')) as SourceMap;
      if (Array.isArray(map.sources)) {
        sources.push(...map.sources.filter((source): source is string => typeof source === 'string'));
      }
    }
  }
  return sources;
}

function publicConfig(gate: string | undefined): unknown {
  const env: NodeJS.ProcessEnv = Object.fromEntries(
    Object.entries({ ...process.env, EXPO_OFFLINE: '1', CI: '1', EXPO_NO_TELEMETRY: '1' }).filter(
      ([name]) => name !== localeGateFlag,
    ),
  );
  const result = spawnSync(
    join(repositoryRoot, 'node_modules', '.bin', 'expo'),
    ['config', '--type', 'public', '--json'],
    {
      cwd: repositoryRoot,
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
      env: gate === undefined ? env : { ...env, [localeGateFlag]: gate },
    },
  );
  return result.status === 0 ? (JSON.parse(result.stdout) as unknown) : undefined;
}

function checkLocaleGate(): boolean {
  const findings = localeGateFindings({
    release: publicConfig(undefined),
    drafts: publicConfig('drafts'),
    eas: JSON.parse(readFileSync(join(repositoryRoot, 'eas.json'), 'utf8')) as unknown,
  });
  if (findings.length > 0) {
    console.log('bundle locale gate: FAIL');
    for (const finding of findings) {
      console.log(`  ${finding}`);
    }
    return false;
  }
  console.log(
    `bundle locale gate: pass, a build without ${localeGateFlag} embeds the reviewed gate, ${localeGateFlag}=drafts embeds drafts, and no eas.json profile sets it`,
  );
  return true;
}

if (!existsSync(rootLayout)) {
  console.log('bundle: skipped, app/_layout.tsx does not exist yet');
} else {
  let failed = !checkLocaleGate();
  for (const platform of platforms) {
    const output = mkdtempSync(join(tmpdir(), `uw-bundle-${platform}-`));
    const result = spawnSync(
      join(repositoryRoot, 'node_modules', '.bin', 'expo'),
      ['export', '--platform', platform, '--output-dir', output, '--source-maps'],
      { cwd: repositoryRoot, encoding: 'utf8', env: { ...process.env, CI: '1' } },
    );
    const sources = result.status === 0 ? mapSources(output) : [];
    rmSync(output, { recursive: true, force: true });
    const log = `${result.stdout}${result.stderr}`;
    const bundled = log.split('\n').find((line) => line.includes('Bundled'));
    const forbidden = forbiddenSources(repositoryRoot, sources);
    if (result.status !== 0) {
      failed = true;
      console.log(`bundle ${platform}: FAIL`);
      console.log(log.trim());
    } else if (sources.length === 0) {
      failed = true;
      console.log(`bundle ${platform}: FAIL, the export wrote no source map to check for sim modules`);
    } else if (forbidden.length > 0) {
      failed = true;
      console.log(
        `bundle ${platform}: FAIL, the native bundle holds ${forbidden.length} QA harness modules (ADR 0008):`,
      );
      for (const path of forbidden.slice(0, 20)) {
        console.log(`  ${path}`);
      }
    } else {
      console.log(
        `bundle ${platform}: pass, ${bundled?.trim() ?? 'bundled'}; ${sources.length} modules, none from sim/, scripts/, sql.js or react-native-web`,
      );
    }
  }
  process.exitCode = failed ? 1 : 0;
}
