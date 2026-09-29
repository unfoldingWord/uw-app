import type { FailureCode } from './domain/failures';
import { hostOf, isAllowedUrl } from './network';
import type { Audio, Db, DbTransaction, Files, Http, Kv, PortError } from './ports';

export type Scope = {
  module: string;
  tables: readonly string[];
  directories: readonly string[];
  keys: readonly string[];
};

function scopeError(code: FailureCode, detail: string): PortError {
  return Object.assign(new Error(`${code}: ${detail}`), { code });
}

function segments(path: string): string[] {
  return path.split('/').filter((part) => part !== '');
}

function within(path: string, directory: string): boolean {
  const parts = segments(path);
  const root = segments(directory);
  return root.length > 0 && root.every((part, index) => parts[index] === part);
}

export function ownsPath(scope: Scope, path: string): boolean {
  if (segments(path).some((part) => part === '.' || part === '..')) {
    return false;
  }
  return scope.directories.some((directory) => within(path, directory));
}

export function ownsKey(scope: Scope, key: string): boolean {
  return scope.keys.some((owned) => key === owned || key.startsWith(`${owned}.`));
}

const writeTargetPatterns: readonly RegExp[] = [
  /\bINSERT\s+(?:OR\s+\w+\s+)?INTO\s+["`[]?(\w+)/gi,
  /\bREPLACE\s+INTO\s+["`[]?(\w+)/gi,
  /(?<!\bDO\s+)\bUPDATE\s+(?:OR\s+\w+\s+)?["`[]?(\w+)/gi,
  /\bDELETE\s+FROM\s+["`[]?(\w+)/gi,
  /\bCREATE\s+(?:TEMP\s+|TEMPORARY\s+|VIRTUAL\s+)?TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?["`[]?(\w+)/gi,
  /\bDROP\s+TABLE\s+(?:IF\s+EXISTS\s+)?["`[]?(\w+)/gi,
  /\bALTER\s+TABLE\s+["`[]?(\w+)/gi,
  /\bCREATE\s+(?:UNIQUE\s+)?INDEX\s+(?:IF\s+NOT\s+EXISTS\s+)?\w+\s+ON\s+["`[]?(\w+)/gi,
];

const statementKinds = /^\s*(SELECT|WITH|INSERT|REPLACE|UPDATE|DELETE|CREATE|DROP|ALTER)\b/i;

const readOnly = /^\s*SELECT\b/i;

export function tablesWrittenIn(text: string): readonly string[] {
  const targets = new Set<string>();
  for (const pattern of writeTargetPatterns) {
    for (const match of text.matchAll(pattern)) {
      if (match[1] !== undefined) {
        targets.add(match[1]);
      }
    }
  }
  return [...targets];
}

export function writeTargets(sql: string): readonly string[] | undefined {
  return statementKinds.test(sql) ? tablesWrittenIn(sql) : undefined;
}

function guardStatement(scope: Scope, sql: string): void {
  if (readOnly.test(sql)) {
    return;
  }
  const targets = writeTargets(sql);
  if (targets === undefined) {
    throw scopeError('kernel.not-owned', `${scope.module} may not run ${sql.trim().split(/\s+/)[0] ?? ''}`);
  }
  const foreign = targets.find((table) => !scope.tables.includes(table));
  if (foreign !== undefined) {
    throw scopeError('kernel.not-owned', `${scope.module} writes ${foreign}, which it does not own`);
  }
}

function scopedTransaction(scope: Scope, db: DbTransaction): DbTransaction {
  return {
    exec: async (sql) => {
      guardStatement(scope, sql);
      await db.exec(sql);
    },
    run: async (sql, params) => {
      guardStatement(scope, sql);
      return db.run(sql, params);
    },
    all: (sql, params) => db.all(sql, params),
    get: (sql, params) => db.get(sql, params),
  };
}

export function scopedDb(scope: Scope, db: Db): Db {
  return {
    ...scopedTransaction(scope, db),
    transaction: (work) => db.transaction((session) => work(scopedTransaction(scope, session))),
  };
}

export function scopedFiles(scope: Scope, files: Files): Files {
  function guard(path: string): void {
    if (!ownsPath(scope, path)) {
      throw scopeError('kernel.not-owned', `${scope.module} writes ${path}, which it does not own`);
    }
  }
  return {
    readBytes: (path) => files.readBytes(path),
    readText: (path) => files.readText(path),
    readRange: (path, offset, length) => files.readRange(path, offset, length),
    list: (path) => files.list(path),
    exists: (path) => files.exists(path),
    size: (path) => files.size(path),
    freeSpace: () => files.freeSpace(),
    writeBytes: async (path, data) => {
      guard(path);
      await files.writeBytes(path, data);
    },
    writeText: async (path, text) => {
      guard(path);
      await files.writeText(path, text);
    },
    appendBytes: async (path, data) => {
      guard(path);
      await files.appendBytes(path, data);
    },
    mkdir: async (path) => {
      guard(path);
      await files.mkdir(path);
    },
    rename: async (from, to) => {
      guard(from);
      guard(to);
      await files.rename(from, to);
    },
    remove: async (path) => {
      guard(path);
      await files.remove(path);
    },
    adopt: async (external, path) => {
      guard(path);
      return files.adopt(external, path);
    },
  };
}

export function scopedKv(scope: Scope, kv: Kv): Kv {
  function guard(key: string): void {
    if (!ownsKey(scope, key)) {
      throw scopeError(
        'kernel.not-owned',
        `${scope.module} uses the preference ${key}, which it does not own`,
      );
    }
  }
  return {
    get: async (key) => {
      guard(key);
      return kv.get(key);
    },
    set: async (key, value) => {
      guard(key);
      await kv.set(key, value);
    },
    delete: async (key) => {
      guard(key);
      await kv.delete(key);
    },
    keys: async () => (await kv.keys()).filter((key) => ownsKey(scope, key)),
  };
}

export function scopedHttp(scope: Scope, http: Http): Http {
  return {
    request: (request) => http.request(request),
    download: async (request) => {
      if (!ownsPath(scope, request.to)) {
        throw scopeError(
          'kernel.not-owned',
          `${scope.module} downloads to ${request.to}, which it does not own`,
        );
      }
      return http.download(request);
    },
    online: () => http.online(),
  };
}

export function allowlistedAudio(audio: Audio): Audio {
  return {
    load: async (source) => {
      if (source.kind === 'url' && !isAllowedUrl(source.url)) {
        throw scopeError(
          'http.host-refused',
          `audio from ${hostOf(source.url) ?? 'an unknown host'} is refused`,
        );
      }
      return audio.load(source);
    },
    play: () => audio.play(),
    pause: () => audio.pause(),
    seek: (positionMs) => audio.seek(positionMs),
    status: () => audio.status(),
    unload: () => audio.unload(),
  };
}
