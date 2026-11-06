import { writeFileSync } from 'node:fs';
import { createWorld } from '@sim/world';
import { fetchBytes, fetchLiveCatalog } from './contract-live';
import { lockPath, lockText, platformModule, platformModulePath } from './bundled/lock';
import { resolveLock } from './bundled/resolve';

const languagesListUrl = 'https://git.door43.org/api/v1/catalog/list/languages?stage=prod&topic=tc-ready';

const megabyte = 1_000_000;

function languageArgument(): string {
  const index = process.argv.indexOf('--language');
  return index === -1 ? 'en' : (process.argv[index + 1] ?? 'en');
}

async function main(): Promise<number> {
  const language = languageArgument();
  const catalog = await fetchLiveCatalog();
  if (!catalog.ok) {
    console.log(`bundled:lock: FAIL, the Door43 catalog did not load: ${catalog.reason}`);
    return 1;
  }
  const world = createWorld();
  for (const page of catalog.pages) {
    world.network.serve(page.url, { body: page.body, headers: page.headers });
  }
  world.network.serve(languagesListUrl, {
    body: await fetchBytes(languagesListUrl),
    headers: { 'content-type': 'application/json' },
  });
  const resolved = new Date().toISOString().slice(0, 10);
  const lock = await resolveLock(world, language, (url) => fetchBytes(url), resolved);
  writeFileSync(lockPath, await lockText(lock));
  writeFileSync(platformModulePath, await platformModule(lock));
  let total = 0;
  for (const archive of lock.archives) {
    total += archive.bytes;
    console.log(
      `  ${archive.file}: ${archive.publisher}/${archive.resource} ${archive.tag}, ${(archive.bytes / megabyte).toFixed(1)} MB`,
    );
  }
  console.log(
    `bundled:lock: pinned ${lock.archives.length} archives for ${language}, ${(total / megabyte).toFixed(1)} MB, resolved ${resolved}`,
  );
  return 0;
}

main().then(
  (code) => {
    process.exitCode = code;
  },
  (error: unknown) => {
    console.log(`bundled:lock: FAIL, ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  },
);
