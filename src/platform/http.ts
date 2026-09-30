import { fetch } from 'expo/fetch';
import { getNetworkStateAsync } from 'expo-network';
import type {
  Files,
  Http,
  HttpDownload,
  HttpDownloaded,
  HttpRequest,
  HttpResponse,
  HttpUnreachable,
} from '@lib/ports';
import { isPortError } from './errors';

export type HostPolicy = {
  permits(url: string): boolean;
  hostOf(url: string): string | undefined;
};

export type PlatformHttpOptions = { policy: HostPolicy; files: Files; maxRedirects?: number };

type Watch = {
  readonly signal: AbortSignal;
  stopped(): HttpUnreachable | undefined;
  touch(): void;
  finish(): void;
};

type FetchResponse = Awaited<ReturnType<typeof fetch>>;

type Landed = { kind: 'landed'; url: string; response: FetchResponse };

const redirectStatuses: ReadonlySet<number> = new Set([301, 302, 303, 307, 308]);
const defaultMaxRedirects = 5;
const writeBatchBytes = 1024 * 1024;

function watch(request: HttpRequest): Watch {
  const controller = new AbortController();
  let reason: 'timeout' | 'cancelled' | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let finished = false;
  const stop = (why: 'timeout' | 'cancelled'): void => {
    if (finished || reason !== undefined) {
      return;
    }
    reason = why;
    controller.abort();
  };
  const touch = (): void => {
    if (timer !== undefined) {
      clearTimeout(timer);
    }
    timer = setTimeout(() => stop('timeout'), request.timeoutMs);
  };
  request.cancel?.onCancel(() => stop('cancelled'));
  touch();
  return {
    signal: controller.signal,
    stopped: () => (reason === undefined ? undefined : { kind: reason }),
    touch,
    finish: () => {
      finished = true;
      if (timer !== undefined) {
        clearTimeout(timer);
      }
    },
  };
}

function headersOf(response: FetchResponse): Record<string, string> {
  const record: Record<string, string> = {};
  response.headers.forEach((value, key) => {
    record[key.toLowerCase()] = value;
  });
  return record;
}

function totalOf(response: FetchResponse): number | undefined {
  const declared = Number(response.headers.get('content-length'));
  return Number.isSafeInteger(declared) && declared >= 0 ? declared : undefined;
}

function joined(parts: readonly Uint8Array[], bytes: number): Uint8Array {
  const whole = new Uint8Array(bytes);
  let at = 0;
  for (const part of parts) {
    whole.set(part, at);
    at += part.byteLength;
  }
  return whole;
}

async function eachChunk(
  response: FetchResponse,
  progress: Watch,
  take: (chunk: Uint8Array) => Promise<void>,
): Promise<void> {
  const reader = response.body?.getReader();
  if (reader === undefined) {
    return;
  }
  for (;;) {
    const next = await reader.read();
    if (next.done) {
      return;
    }
    progress.touch();
    await take(next.value);
  }
}

export function createPlatformHttp(options: PlatformHttpOptions): Http {
  const { policy, files } = options;
  const maxRedirects = options.maxRedirects ?? defaultMaxRedirects;

  async function land(
    request: HttpRequest,
    progress: Watch,
    headers: Readonly<Record<string, string>>,
  ): Promise<Landed | HttpUnreachable> {
    let url = request.url;
    for (let hop = 0; ; hop += 1) {
      if (!policy.permits(url)) {
        return { kind: 'refused', host: policy.hostOf(url) };
      }
      const response = await fetch(url, {
        method: request.method ?? 'GET',
        headers: { ...headers },
        ...(request.body === undefined ? {} : { body: new Uint8Array(request.body) }),
        redirect: 'manual',
        credentials: 'omit',
        signal: progress.signal,
      });
      const location = response.headers.get('location');
      if (
        request.method === 'POST' ||
        !redirectStatuses.has(response.status) ||
        location === null ||
        hop >= maxRedirects
      ) {
        return { kind: 'landed', url, response };
      }
      await response.body?.cancel();
      url = new URL(location, url).href;
      progress.touch();
    }
  }

  async function attempt<T>(
    request: HttpRequest,
    headers: Readonly<Record<string, string>>,
    read: (landed: Landed, progress: Watch) => Promise<T>,
  ): Promise<T | HttpUnreachable> {
    if (request.cancel?.cancelled) {
      return { kind: 'cancelled' };
    }
    const progress = watch(request);
    try {
      const landed = await land(request, progress, headers);
      return landed.kind === 'landed' ? await read(landed, progress) : landed;
    } catch (error) {
      if (isPortError(error)) {
        throw error;
      }
      return progress.stopped() ?? { kind: 'offline' };
    } finally {
      progress.finish();
    }
  }

  function request(request: HttpRequest): Promise<HttpResponse> {
    return attempt(request, request.headers ?? {}, async ({ url, response }, progress) => {
      const total = totalOf(response);
      const parts: Uint8Array[] = [];
      let received = 0;
      if (request.method !== 'HEAD') {
        await eachChunk(response, progress, async (chunk) => {
          parts.push(chunk);
          received += chunk.byteLength;
          request.onProgress?.(received, total);
        });
      }
      request.onProgress?.(received, total ?? received);
      return {
        kind: 'response',
        url,
        status: response.status,
        headers: headersOf(response),
        body: joined(parts, received),
      };
    });
  }

  function download(request: HttpDownload): Promise<HttpDownloaded> {
    const from = request.resumeFrom ?? 0;
    const headers = from > 0 ? { ...request.headers, range: `bytes=${from}-` } : (request.headers ?? {});
    return attempt(request, headers, async ({ url, response }, progress) => {
      const ok = response.status >= 200 && response.status < 300;
      const total = totalOf(response);
      let skip = from > 0 && response.status !== 206 ? from : 0;
      let received = 0;
      let batch: Uint8Array[] = [];
      let batched = 0;
      const flush = async (): Promise<void> => {
        if (batched > 0) {
          await files.appendBytes(request.to, joined(batch, batched));
          batch = [];
          batched = 0;
        }
      };
      if (ok && from === 0) {
        await files.writeBytes(request.to, new Uint8Array());
      }
      await eachChunk(response, progress, async (chunk) => {
        const kept = skip >= chunk.byteLength ? new Uint8Array() : chunk.subarray(skip);
        skip = Math.max(0, skip - chunk.byteLength);
        received += kept.byteLength;
        request.onProgress?.(received, total);
        if (!ok) {
          return;
        }
        batch.push(kept);
        batched += kept.byteLength;
        if (batched >= writeBatchBytes) {
          await flush();
        }
      });
      await flush();
      request.onProgress?.(received, total ?? received);
      return {
        kind: 'response',
        url,
        status: from > 0 && ok ? 206 : response.status,
        headers: headersOf(response),
        bytes: received,
      };
    });
  }

  return {
    request,
    download,
    online: async () => {
      try {
        const state = await getNetworkStateAsync();
        return state.isConnected === true && state.isInternetReachable !== false;
      } catch {
        return false;
      }
    },
  };
}
