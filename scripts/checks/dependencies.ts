export type LockedPackage = { name: string; dev: boolean };

export const networkClients = [
  'axios',
  'node-fetch',
  'cross-fetch',
  'isomorphic-fetch',
  'got',
  'ky',
  'superagent',
  'undici',
  'ws',
  'socket.io-client',
  'engine.io-client',
  'mqtt',
  'react-native-tcp-socket',
  'react-native-udp',
  'react-native-sse',
  'expo-updates',
  'expo-notifications',
];

export const reportingSdks =
  /^(@sentry\/|sentry-expo$|@bugsnag\/|@segment\/|@amplitude\/|amplitude-js$|mixpanel|@react-native-firebase\/|firebase$|@firebase\/|@datadog\/|posthog|@newrelic\/|newrelic|appcenter|@microsoft\/applicationinsights|react-native-google-analytics|expo-analytics|expo-insights$|@expo\/insights|expo-firebase|@react-native-community\/netinfo-telemetry|react-native-device-info$)/;

export type DependencyInput = {
  runtime: readonly string[];
  locked: readonly LockedPackage[];
  documented: readonly string[];
};

export function dependencyFindings(input: DependencyInput): string[] {
  const findings: string[] = [];
  for (const name of input.runtime) {
    if (networkClients.includes(name)) {
      findings.push(`${name} opens connections itself; the network is reached only through the Http port`);
    }
    if (!input.documented.includes(name)) {
      findings.push(`${name} is a runtime dependency with no line in docs/dependencies.md`);
    }
  }
  const reporting = new Set(
    input.locked.filter((item) => !item.dev && reportingSdks.test(item.name)).map((item) => item.name),
  );
  for (const name of [...reporting].sort()) {
    findings.push(`${name} reports to a third party; it fails review (AGENTS.md section 10)`);
  }
  return findings;
}

export function documentedPackages(markdown: string): string[] {
  const runtime = markdown.split(/^## /m).find((section) => section.startsWith('Runtime')) ?? '';
  return runtime.split('\n').flatMap((line) => {
    const name = /^\|\s*([@a-z0-9][^|\s]*)\s*\|/.exec(line)?.[1];
    return name === undefined || name === 'Package' ? [] : [name];
  });
}
