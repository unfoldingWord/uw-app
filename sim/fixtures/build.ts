import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { archiveDirectory, fixturesDirectory, generateFixtures } from './generate.ts';

const output = await generateFixtures();
rmSync(join(fixturesDirectory, archiveDirectory), { recursive: true, force: true });
let bytes = 0;
for (const [file, content] of output) {
  const path = join(fixturesDirectory, file);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content);
  bytes += content.length;
}
console.log(`fixtures: wrote ${output.size} files, ${bytes} bytes, under sim/fixtures`);
