import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const repositoryRoot = join(import.meta.dirname, '..');
const rootLayout = join(repositoryRoot, 'app', '_layout.tsx');
const platforms = ['android', 'ios'];

if (!existsSync(rootLayout)) {
  console.log('bundle: skipped, app/_layout.tsx does not exist yet');
} else {
  let failed = false;
  for (const platform of platforms) {
    const output = mkdtempSync(join(tmpdir(), `uw-bundle-${platform}-`));
    const result = spawnSync(
      join(repositoryRoot, 'node_modules', '.bin', 'expo'),
      ['export', '--platform', platform, '--output-dir', output],
      { cwd: repositoryRoot, encoding: 'utf8', env: { ...process.env, CI: '1' } },
    );
    rmSync(output, { recursive: true, force: true });
    const log = `${result.stdout}${result.stderr}`;
    const bundled = log.split('\n').find((line) => line.includes('Bundled'));
    if (result.status === 0) {
      console.log(`bundle ${platform}: pass, ${bundled?.trim() ?? 'bundled'}`);
    } else {
      failed = true;
      console.log(`bundle ${platform}: FAIL`);
      console.log(log.trim());
    }
  }
  process.exitCode = failed ? 1 : 0;
}
