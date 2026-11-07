import { existsSync, readFileSync } from 'node:fs';
import { fetchBytes } from './contract-live';
import { fetchBundled } from './bundled/fetch';
import { carriedDirectory, lockPath, parseLock, platformModule, platformModulePath } from './bundled/lock';

const megabyte = 1_000_000;

async function main(): Promise<number> {
  if (!existsSync(lockPath)) {
    console.log(
      'bundled:fetch: FAIL, content/bundled.lock.json is missing, so this build would ship no content',
    );
    return 1;
  }
  const read = parseLock(readFileSync(lockPath, 'utf8'));
  if (!read.ok) {
    console.log(`bundled:fetch: FAIL, ${read.reason}`);
    return 1;
  }
  const { lock } = read;
  const expected = await platformModule(lock);
  if (!existsSync(platformModulePath) || readFileSync(platformModulePath, 'utf8') !== expected) {
    console.log(
      'bundled:fetch: FAIL, src/platform/bundled-archives.ts does not match the lock; run npm run bundled:lock',
    );
    return 1;
  }
  const report = await fetchBundled(lock, (url) => fetchBytes(url), carriedDirectory);
  console.log(
    `bundled:fetch: pass, ${lock.archives.length} archives for ${lock.language} (${(report.bytes / megabyte).toFixed(1)} MB) verified by size, sha256 and the content contract, and placed offline in the sim; ${report.written.length} fetched, ${report.kept.length} already present${report.removed.length > 0 ? `, ${report.removed.length} stale removed` : ''}`,
  );
  return 0;
}

main().then(
  (code) => {
    process.exitCode = code;
  },
  (error: unknown) => {
    console.log(`bundled:fetch: FAIL, ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  },
);
