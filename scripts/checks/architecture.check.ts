import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { eventSchemas } from '@lib/domain/events';
import { kernelModules } from '@lib/kernel';
import { architectureDrift, portsOf } from './architecture-drift.ts';
import type { Check } from './check.ts';

const repositoryRoot = join(import.meta.dirname, '..', '..');

const check: Check = {
  name: 'architecture',
  rule: "docs/architecture.md's module, port and event counts and lists agree with kernelModules, Ports and eventSchemas",
  run() {
    const facts = {
      modules: Object.keys(kernelModules),
      ports: portsOf(readFileSync(join(repositoryRoot, 'src', 'lib', 'ports.ts'), 'utf8')),
      events: Object.keys(eventSchemas),
    };
    const findings = architectureDrift(
      readFileSync(join(repositoryRoot, 'docs', 'architecture.md'), 'utf8'),
      facts,
    );
    if (findings.length > 0) {
      return { status: 'fail', findings };
    }
    return {
      status: 'pass',
      summary: `${facts.modules.length} modules, ${facts.ports.length} ports and ${facts.events.length} events, counted and listed as in the tree`,
    };
  },
};

export default check;
