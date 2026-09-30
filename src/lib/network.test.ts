import { describe, expect, it } from 'vitest';
import { allowedHosts, hostOf, isAllowedUrl } from './network';
import { allowlistedHttp } from './guard';
import type { Http } from './ports';

describe('the host allowlist', () => {
  it('admits only https to the listed hosts', () => {
    expect(allowedHosts).toEqual(['git.door43.org', 'cdn.door43.org', 'unfoldingword.org']);
    expect(isAllowedUrl('https://cdn.door43.org/obs/jpg/360px/obs-en-01-01.jpg')).toBe(true);
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

  it('refuses a response that landed off the allowlist after a redirect', async () => {
    const http: Http = {
      request: async () => ({
        kind: 'response',
        url: 'https://tracker.example/landing',
        status: 200,
        headers: {},
        body: new Uint8Array(),
      }),
      download: async (request) => ({
        kind: 'response',
        url: request.url.replace('git.door43.org', 'mirror.example'),
        status: 200,
        headers: {},
        bytes: 0,
      }),
      online: async () => true,
    };
    const guarded = allowlistedHttp(http);
    expect(await guarded.request({ url: 'https://git.door43.org/x', timeoutMs: 10 })).toEqual({
      kind: 'refused',
      host: 'tracker.example',
    });
    expect(await guarded.download({ url: 'https://git.door43.org/x', timeoutMs: 10, to: 'x' })).toEqual({
      kind: 'refused',
      host: 'mirror.example',
    });
  });
});
