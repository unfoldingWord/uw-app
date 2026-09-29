import { allowedHosts, hostOf, isAllowedUrl } from '@lib/network';
import type { Files, Http, HttpRequest, HttpResponse } from '@lib/ports';

export type Route = {
  status?: number;
  body: Uint8Array | string;
  headers?: Readonly<Record<string, string>>;
  redirect?: string;
};

export type MemoryNetwork = {
  serve(url: string, route: Route): void;
  unserve(url: string): void;
  lookup(url: string): Route | undefined;
};

export type ScriptedOutcome = 'offline' | 'timeout' | { status: number };

export type MemoryHttp = Http & {
  setOnline(online: boolean): void;
  script(urlPrefix: string, outcome: ScriptedOutcome, times?: number): void;
  hold(urlPrefix: string): () => void;
  requests(): readonly string[];
};

const progressChunk = 64 * 1024;

export function createMemoryNetwork(): MemoryNetwork {
  const routes = new Map<string, Route>();
  return {
    serve: (url, route) => {
      routes.set(url, route);
    },
    unserve: (url) => {
      routes.delete(url);
    },
    lookup: (url) => routes.get(url),
  };
}

function bytesOf(body: Uint8Array | string): Uint8Array {
  return typeof body === 'string' ? new TextEncoder().encode(body) : body.slice();
}

export function createMemoryHttp(options: {
  network: MemoryNetwork;
  files: Files;
  hosts?: readonly string[];
}): MemoryHttp {
  const hosts = options.hosts ?? allowedHosts;
  const scripts: { prefix: string; outcome: ScriptedOutcome; remaining: number }[] = [];
  const log: string[] = [];
  const holds: { prefix: string; released: Promise<void> }[] = [];
  let online = true;

  async function held(request: HttpRequest): Promise<void> {
    const waiting = holds.filter((item) => request.url.startsWith(item.prefix)).map((item) => item.released);
    if (waiting.length === 0) {
      return;
    }
    const cancelled = new Promise<void>((resolve) => request.cancel?.onCancel(resolve));
    await Promise.race([Promise.all(waiting), cancelled]);
  }

  function landing(url: string): { url: string; route: Route | undefined } {
    const route = options.network.lookup(url);
    if (route?.redirect === undefined) {
      return { url, route };
    }
    return { url: route.redirect, route: options.network.lookup(route.redirect) };
  }

  function scripted(url: string): ScriptedOutcome | undefined {
    const script = scripts.find((item) => item.remaining > 0 && url.startsWith(item.prefix));
    if (script === undefined) {
      return undefined;
    }
    script.remaining -= 1;
    return script.outcome;
  }

  function respond(request: HttpRequest): HttpResponse {
    log.push(`${request.method ?? 'GET'} ${request.url}`);
    if (!isAllowedUrl(request.url, hosts)) {
      return { kind: 'refused', host: hostOf(request.url) };
    }
    if (!online) {
      return { kind: 'offline' };
    }
    if (request.cancel?.cancelled) {
      return { kind: 'cancelled' };
    }
    const outcome = scripted(request.url);
    if (outcome === 'offline' || outcome === 'timeout') {
      return { kind: outcome };
    }
    const { url, route } = landing(request.url);
    const status = outcome?.status ?? route?.status ?? (route === undefined ? 404 : 200);
    const body = request.method === 'HEAD' || route === undefined ? new Uint8Array() : bytesOf(route.body);
    const headers = { 'content-length': String(body.byteLength), ...route?.headers };
    for (let received = progressChunk; received < body.byteLength; received += progressChunk) {
      request.onProgress?.(received, body.byteLength);
    }
    request.onProgress?.(body.byteLength, body.byteLength);
    return { kind: 'response', url, status, headers, body };
  }

  return {
    request: async (request) => {
      await held(request);
      return respond(request);
    },
    download: async (request) => {
      await held(request);
      const response = respond(request);
      if (response.kind !== 'response') {
        return response;
      }
      const from = request.resumeFrom ?? 0;
      const ok = response.status >= 200 && response.status < 300;
      const body = from > 0 && ok ? response.body.slice(from) : response.body;
      if (ok && from > 0) {
        await options.files.appendBytes(request.to, body);
      } else if (ok) {
        await options.files.writeBytes(request.to, body);
      }
      return {
        kind: 'response',
        url: response.url,
        status: from > 0 && ok ? 206 : response.status,
        headers: response.headers,
        bytes: body.byteLength,
      };
    },
    online: async () => online,
    setOnline: (next) => {
      online = next;
    },
    script: (prefix, outcome, times = 1) => {
      scripts.push({ prefix, outcome, remaining: times });
    },
    hold: (prefix) => {
      let release = (): void => undefined;
      const released = new Promise<void>((resolve) => {
        release = resolve;
      });
      const hold = { prefix, released };
      holds.push(hold);
      return () => {
        holds.splice(holds.indexOf(hold), 1);
        release();
      };
    },
    requests: () => log.slice(),
  };
}
