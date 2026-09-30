import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
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

if (!existsSync(rootLayout)) {
  console.log('bundle: skipped, app/_layout.tsx does not exist yet');
} else {
  let failed = false;
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
        `bundle ${platform}: FAIL, the native bundle holds ${forbidden.length} QA harness modules (docs/exceptions.md):`,
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
