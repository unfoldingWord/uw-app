import { existsSync, readFileSync, statSync } from 'node:fs';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { extname, join, normalize, sep } from 'node:path';

const contentTypes: Readonly<Record<string, string>> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json',
  '.wasm': 'application/wasm',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ttf': 'font/ttf',
  '.css': 'text/css',
  '.ico': 'image/x-icon',
};

export type Mount = { readonly prefix: string; readonly directory: string };

export type Served = { readonly origin: string; close(): Promise<void> };

function fileWithin(directory: string, path: string): string | undefined {
  const candidate = normalize(join(directory, decodeURIComponent(path)));
  if (!candidate.startsWith(`${normalize(directory)}${sep}`) && candidate !== normalize(directory)) {
    return undefined;
  }
  return existsSync(candidate) && statSync(candidate).isFile() ? candidate : undefined;
}

export function serveStatic(options: { root: string; mounts: readonly Mount[] }): Promise<Served> {
  const fallback = join(options.root, 'index.html');
  const server: Server = createServer((request, response) => {
    const path = new URL(request.url ?? '/', 'http://localhost').pathname;
    const mount = options.mounts.find((item) => path.startsWith(item.prefix));
    const file = mount
      ? fileWithin(mount.directory, path.slice(mount.prefix.length))
      : (fileWithin(options.root, path) ?? fallback);
    if (file === undefined) {
      response.writeHead(404).end();
      return;
    }
    response.writeHead(200, {
      'content-type': contentTypes[extname(file)] ?? 'application/octet-stream',
      'cache-control': 'no-store',
    });
    response.end(readFileSync(file));
  });
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address() as AddressInfo;
      resolve({
        origin: `http://127.0.0.1:${port}`,
        close: () => new Promise<void>((done) => server.close(() => done())),
      });
    });
  });
}
