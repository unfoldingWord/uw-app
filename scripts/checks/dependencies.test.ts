import { describe, expect, it } from 'vitest';
import { dependencyFindings, documentedPackages } from './dependencies.ts';

describe('dependencyFindings (AGENTS.md sections 6 and 10)', () => {
  it('refuses a runtime socket client, an undocumented dependency and a reporting SDK anywhere in production', () => {
    expect(
      dependencyFindings({
        runtime: ['fflate', 'axios', 'left-pad'],
        locked: [
          { name: '@sentry/react-native', dev: false },
          { name: 'posthog-react-native', dev: false },
          { name: 'ws', dev: false },
          { name: '@sentry/node', dev: true },
        ],
        documented: ['fflate', 'axios'],
      }),
    ).toEqual([
      'axios opens connections itself; the network is reached only through the Http port',
      'left-pad is a runtime dependency with no line in docs/dependencies.md',
      '@sentry/react-native reports to a third party; it fails review (AGENTS.md section 10)',
      'posthog-react-native reports to a third party; it fails review (AGENTS.md section 10)',
    ]);
  });

  it('reads the runtime table of docs/dependencies.md', () => {
    const markdown = [
      '# Dependencies',
      '## Runtime',
      '| Package | Version | Replaces |',
      '|---|---|---|',
      '| expo | ~57 | x |',
      '| @noble/hashes | ^2 | y |',
      '## Development',
      '| vitest | ^5 | z |',
    ].join('\n');
    expect(documentedPackages(markdown)).toEqual(['expo', '@noble/hashes']);
  });
});
