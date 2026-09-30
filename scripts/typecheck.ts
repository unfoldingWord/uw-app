import { spawnSync } from 'node:child_process';
import { join } from 'node:path';

const repositoryRoot = join(import.meta.dirname, '..');
const projects = ['tsconfig.json', 'tsconfig.lib.json', 'tsconfig.node.json'];
const compiler = join(repositoryRoot, 'node_modules', '.bin', 'tsc');

let failed = false;
for (const project of projects) {
  const result = spawnSync(compiler, ['-p', project, '--noEmit', '--pretty', 'false'], {
    cwd: repositoryRoot,
    encoding: 'utf8',
  });
  const output = `${result.stdout}${result.stderr}`.trim();
  if (result.status === 0) {
    console.log(`typecheck ${project}: pass`);
  } else {
    failed = true;
    console.log(`typecheck ${project}: FAIL`);
    console.log(output);
  }
}
process.exitCode = failed ? 1 : 0;
