export const telemetryEndpoint: string | undefined = undefined;

export const contentHosts: readonly string[] = Object.freeze([
  'git.door43.org',
  'cdn.door43.org',
  'unfoldingword.org',
]);

const httpsUrl = /^https:\/\/([a-z0-9.-]+)(?::443)?(?:[/?#]|$)/i;

export function hostOf(url: string): string | undefined {
  return httpsUrl.exec(url)?.[1]?.toLowerCase();
}

export function allowedHostsFor(endpoint: string | undefined): readonly string[] {
  const host = endpoint === undefined ? undefined : hostOf(endpoint);
  return Object.freeze(
    host === undefined || contentHosts.includes(host) ? [...contentHosts] : [...contentHosts, host],
  );
}

export const allowedHosts: readonly string[] = allowedHostsFor(telemetryEndpoint);

export function isAllowedUrl(url: string, hosts: readonly string[] = allowedHosts): boolean {
  const host = hostOf(url);
  return host !== undefined && hosts.includes(host);
}
