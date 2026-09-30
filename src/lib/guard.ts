import { hostOf, isAllowedUrl } from './network';
import type { Http, HttpDownloaded, HttpResponse } from './ports';

function refused(url: string): { kind: 'refused'; host: string | undefined } {
  return { kind: 'refused', host: hostOf(url) };
}

function landed<T extends HttpResponse | HttpDownloaded>(response: T): T | ReturnType<typeof refused> {
  return response.kind === 'response' && !isAllowedUrl(response.url) ? refused(response.url) : response;
}

export function allowlistedHttp(http: Http): Http {
  return {
    request: async (request) =>
      isAllowedUrl(request.url) ? landed(await http.request(request)) : refused(request.url),
    download: async (request) =>
      isAllowedUrl(request.url) ? landed(await http.download(request)) : refused(request.url),
    online: () => http.online(),
  };
}
