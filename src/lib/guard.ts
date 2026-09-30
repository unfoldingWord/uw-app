import { allowedHostsFor, hostOf, isAllowedUrl } from './network';
import type { Http, HttpDownloaded, HttpRequest, HttpResponse } from './ports';

export type SendPolicy = { readonly endpoint: string | undefined; readonly hosts: readonly string[] };

export function sendPolicyFor(endpoint: string | undefined): SendPolicy {
  return Object.freeze({ endpoint, hosts: allowedHostsFor(endpoint) });
}

function refused(url: string): { kind: 'refused'; host: string | undefined } {
  return { kind: 'refused', host: hostOf(url) };
}

function permitted(request: HttpRequest, policy: SendPolicy): boolean {
  if (!isAllowedUrl(request.url, policy.hosts)) {
    return false;
  }
  return request.method !== 'POST' || (policy.endpoint !== undefined && request.url === policy.endpoint);
}

export function allowlistedHttp(http: Http, policy: SendPolicy = sendPolicyFor(undefined)): Http {
  function landed<T extends HttpResponse | HttpDownloaded>(response: T): T | ReturnType<typeof refused> {
    return response.kind === 'response' && !isAllowedUrl(response.url, policy.hosts)
      ? refused(response.url)
      : response;
  }
  return {
    request: async (request) =>
      permitted(request, policy) ? landed(await http.request(request)) : refused(request.url),
    download: async (request) =>
      permitted(request, policy) && request.method !== 'POST'
        ? landed(await http.download(request))
        : refused(request.url),
    online: () => http.online(),
  };
}
