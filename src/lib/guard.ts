import { hostOf, isAllowedUrl } from './network';
import type { Http } from './ports';

export function allowlistedHttp(http: Http): Http {
  return {
    request: (request) =>
      isAllowedUrl(request.url)
        ? http.request(request)
        : Promise.resolve({ kind: 'refused', host: hostOf(request.url) }),
    download: (request) =>
      isAllowedUrl(request.url)
        ? http.download(request)
        : Promise.resolve({ kind: 'refused', host: hostOf(request.url) }),
    online: () => http.online(),
  };
}
