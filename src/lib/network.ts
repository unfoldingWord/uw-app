export const allowedHosts: readonly string[] = Object.freeze(['git.door43.org', 'unfoldingword.org']);

const httpsUrl = /^https:\/\/([a-z0-9.-]+)(?::443)?(?:[/?#]|$)/i;

export function hostOf(url: string): string | undefined {
  return httpsUrl.exec(url)?.[1]?.toLowerCase();
}

export function isAllowedUrl(url: string, hosts: readonly string[] = allowedHosts): boolean {
  const host = hostOf(url);
  return host !== undefined && hosts.includes(host);
}
