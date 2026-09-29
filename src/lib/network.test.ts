import { describe, expect, it } from 'vitest';
import { allowedHosts, hostOf, isAllowedUrl } from './network';
import { allowlistedHttp } from './guard';
import type { Http } from './ports';

describe('the host allowlist', () => {
  it('admits only https to the listed hosts', () => {
    expect(allowedHosts).toEqual(['git.door43.org', 'unfoldingword.org']);
    expect(isAllowedUrl('https://git.door43.org/api/v1/catalog/search')).toBe(true);
    expect(isAllowedUrl('https://GIT.door43.org:443/x')).toBe(true);
    expect(isAllowedUrl('https://unfoldingword.org')).toBe(true);
    expect(isAllowedUrl('http://git.door43.org/api')).toBe(false);
    expect(isAllowedUrl('https://git.door43.org.evil.example/api')).toBe(false);
    expect(isAllowedUrl('https://evil.example/?https://git.door43.org/')).toBe(false);
    expect(isAllowedUrl('https://git.door43.org:8443/api')).toBe(false);
    expect(hostOf('https://Unfoldingword.org/give')).toBe('unfoldingword.org');
  });

  it('refuses other hosts before the adapter is reached', async () => {
    const reached: string[] = [];
    const http: Http = {
      request: async (request) => {
        reached.push(request.url);
        return { kind: 'offline' };
      },
      download: async (request) => {
        reached.push(request.url);
        return { kind: 'offline' };
      },
      online: async () => true,
    };
    const guarded = allowlistedHttp(http);
    expect(await guarded.request({ url: 'https://tracker.example/pixel', timeoutMs: 10 })).toEqual({
      kind: 'refused',
      host: 'tracker.example',
    });
    expect(await guarded.download({ url: 'https://tracker.example/x', timeoutMs: 10, to: 'x' })).toEqual({
      kind: 'refused',
      host: 'tracker.example',
    });
    expect(await guarded.request({ url: 'https://git.door43.org/api', timeoutMs: 10 })).toEqual({
      kind: 'offline',
    });
    expect(reached).toEqual(['https://git.door43.org/api']);
  });
});
