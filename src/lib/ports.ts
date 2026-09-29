import type { FailureCode } from './domain/failures';
import type { Provenance } from './domain/provenance';

export type PortError = Error & { readonly code: FailureCode };

export type Clock = {
  now(): number;
  dayOf(at: number): string;
};

export type Ids = {
  next(): string;
};

export type FileEntry = { name: string; kind: 'file' | 'directory'; bytes: number };

export type Files = {
  readBytes(path: string): Promise<Uint8Array>;
  readText(path: string): Promise<string>;
  writeBytes(path: string, data: Uint8Array): Promise<void>;
  writeText(path: string, text: string): Promise<void>;
  list(path: string): Promise<readonly FileEntry[]>;
  exists(path: string): Promise<boolean>;
  size(path: string): Promise<number>;
  mkdir(path: string): Promise<void>;
  rename(from: string, to: string): Promise<void>;
  remove(path: string): Promise<void>;
  freeSpace(): Promise<number>;
};

export type SqlValue = string | number | null | Uint8Array;

export type Row = Readonly<Record<string, SqlValue>>;

export type RunResult = { changes: number; lastInsertRowId: number };

export type DbSession = {
  exec(sql: string): Promise<void>;
  run(sql: string, params?: readonly SqlValue[]): Promise<RunResult>;
  all(sql: string, params?: readonly SqlValue[]): Promise<readonly Row[]>;
  get(sql: string, params?: readonly SqlValue[]): Promise<Row | undefined>;
};

export type Db = DbSession & {
  transaction<T>(work: (session: DbSession) => Promise<T>): Promise<T>;
};

export type Migration = { id: string; statements: readonly string[] };

export type Kv = {
  get(key: string): Promise<string | undefined>;
  set(key: string, value: string): Promise<void>;
  delete(key: string): Promise<void>;
  keys(): Promise<readonly string[]>;
};

export type HttpMethod = 'GET' | 'HEAD';

export type HttpProgress = (receivedBytes: number, totalBytes: number | undefined) => void;

export type HttpRequest = {
  url: string;
  method?: HttpMethod;
  timeoutMs: number;
  headers?: Readonly<Record<string, string>>;
  onProgress?: HttpProgress;
};

export type HttpDownload = HttpRequest & { to: string };

export type HttpUnreachable =
  { kind: 'offline' } | { kind: 'timeout' } | { kind: 'refused'; host: string | undefined };

export type HttpResponse =
  | { kind: 'response'; status: number; headers: Readonly<Record<string, string>>; body: Uint8Array }
  | HttpUnreachable;

export type HttpDownloaded =
  | { kind: 'response'; status: number; headers: Readonly<Record<string, string>>; bytes: number }
  | HttpUnreachable;

export type Http = {
  request(request: HttpRequest): Promise<HttpResponse>;
  download(request: HttpDownload): Promise<HttpDownloaded>;
  online(): Promise<boolean>;
};

export type DevicePlatform = 'ios' | 'android';

export type Peer = { id: string; code: string; platform: DevicePlatform };

export type TransportLink = {
  readonly peer: Peer;
  send(chunk: Uint8Array): Promise<void>;
  receive(): Promise<Uint8Array | undefined>;
  close(): Promise<void>;
};

export type Advertisement = {
  readonly code: string;
  accept(timeoutMs: number): Promise<TransportLink | undefined>;
  stop(): Promise<void>;
};

export type AppPackage = { path: string; bytes: number };

export type Transport = {
  available(): Promise<boolean>;
  platform(): DevicePlatform;
  maxChunkBytes(): number;
  advertise(code: string): Promise<Advertisement>;
  discover(timeoutMs: number): Promise<readonly Peer[]>;
  connect(peer: Peer, timeoutMs: number): Promise<TransportLink>;
  appPackage(): Promise<AppPackage | undefined>;
};

export type AudioSource = { kind: 'file'; path: string } | { kind: 'url'; url: string };

export type AudioState = 'idle' | 'loading' | 'ready' | 'playing' | 'paused' | 'ended';

export type AudioStatus = { state: AudioState; positionMs: number; durationMs: number };

export type Audio = {
  load(source: AudioSource): Promise<AudioStatus>;
  play(): Promise<void>;
  pause(): Promise<void>;
  seek(positionMs: number): Promise<void>;
  status(): AudioStatus;
  unload(): Promise<void>;
};

export type SharePayload = {
  title: string;
  text: string;
  file?: { path: string; mimeType: string };
  provenance: readonly Provenance[];
};

export type ShareOutcome = 'shared' | 'dismissed';

export type ShareSheet = {
  share(payload: SharePayload): Promise<ShareOutcome>;
};

export type DeviceLocale = { tag: string; region: string | undefined; timeZone: string; rtl: boolean };

export type Locale = {
  current(): DeviceLocale;
};

export type Ports = {
  clock: Clock;
  ids: Ids;
  files: Files;
  db: Db;
  kv: Kv;
  http: Http;
  transport: Transport;
  audio: Audio;
  shareSheet: ShareSheet;
  locale: Locale;
};
