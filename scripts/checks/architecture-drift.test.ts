import { describe, expect, it } from 'vitest';
import { architectureDrift, countOf, portsOf } from './architecture-drift.ts';

const markdown = (modules: string, ports: string, events: string) =>
  [
    '# Architecture',
    '',
    '```',
    'lib/kernel      createKernel(ports, options)',
    'lib/modules     Telemetry  Catalog',
    '                Player          (Journal is the kernel own)',
    'ports           the interfaces',
    '```',
    '',
    `The interface is the union of ${modules} module interfaces (\`kernelModules\` in \`src/lib/kernel.ts\`).`,
    '',
    '## Ports',
    '',
    `There are ${ports} (\`Ports\` in \`src/lib/ports.ts\`).`,
    '',
    '| Port | Provides | Memory adapter |',
    '|---|---|---|',
    '| Clock | now | settable |',
    '| ShareSheet | hand a payload | records |',
    '',
    '## Events are the spine',
    '',
    `There are ${events} (\`eventSchemas\` in \`src/lib/domain/events.ts\`):`,
    '',
    '```',
    'AppOpened   Failure(code, context)',
    'PackInstalled',
    '```',
  ].join('\n');

const facts = {
  modules: ['telemetry', 'catalog', 'player'],
  ports: ['clock', 'shareSheet'],
  events: ['AppOpened', 'Failure', 'PackInstalled'],
};

describe('architectureDrift (issue #65)', () => {
  it('passes when the counts and the lists agree with the tree', () => {
    expect(architectureDrift(markdown('three', 'two', '3'), facts)).toEqual([]);
  });

  it('names a count and a list that drifted from kernel.ts, ports.ts and events.ts', () => {
    expect(
      architectureDrift(markdown('twelve', 'two', '3'), {
        modules: facts.modules,
        ports: [...facts.ports, 'radio'],
        events: ['AppOpened', 'Failure', 'PackInstalled', 'PackRemoved'],
      }),
    ).toEqual([
      'architecture.md says twelve modules; `kernelModules` in src/lib/kernel.ts has 3',
      'architecture.md says two ports; `Ports` in src/lib/ports.ts has 3',
      'architecture.md says 3 events; `eventSchemas` in src/lib/domain/events.ts has 4',
      'architecture.md does not list the ports radio',
      'architecture.md does not list the events PackRemoved',
    ]);
  });

  it('fails when a sentence the check reads is gone', () => {
    const findings = architectureDrift('# Architecture\n', facts);
    expect(findings).toContain(
      'architecture.md no longer states the number of ports next to `Ports` in src/lib/ports.ts',
    );
    expect(findings).toContain('architecture.md no longer lists the events where the check reads them');
  });

  it('reads number words and the Ports type', () => {
    expect([countOf('eleven'), countOf('43'), countOf('many')]).toEqual([11, 43, undefined]);
    expect(portsOf('export type Ports = {\n  clock: Clock;\n  shareSheet: ShareSheet;\n};')).toEqual([
      'clock',
      'shareSheet',
    ]);
  });
});
