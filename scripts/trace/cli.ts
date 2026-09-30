import { testProvenRequirements, traceRepository } from '@sim/trace';

const enforce = process.argv.includes('--enforce');
const { ids, missing, noScenario, byTest, stray } = traceRepository();

console.log(
  `trace: ${ids.length} Must requirements, ${ids.length - noScenario.length - byTest.length} with a scenario, ${byTest.length} proven by a test on the documented list, ${missing.length} unproven`,
);
for (const id of byTest) {
  console.log(`test in place of a scenario (${id}): ${testProvenRequirements[id] ?? ''}`);
}
if (noScenario.length > 0) {
  console.log(`${enforce ? 'FAIL ' : ''}no scenario (DX-4): ${noScenario.join(' ')}`);
}
if (missing.length > 0) {
  console.log(`${enforce ? 'FAIL ' : ''}unproven: ${missing.join(' ')}`);
}
if (stray.length > 0) {
  console.log(`FAIL scenarios named for no Must requirement in docs/PRD.md: ${stray.join(' ')}`);
}
if (!enforce) {
  console.log('trace: reporting only; npm run trace passes --enforce');
}
process.exitCode = stray.length > 0 || (enforce && noScenario.length > 0) ? 1 : 0;
