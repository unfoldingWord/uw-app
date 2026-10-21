import { requireNativeModule } from 'expo';

export type NativeExtracted = {
  readonly ok: boolean;
  readonly rule?: string;
  readonly path?: string;
  readonly files?: readonly { readonly path: string; readonly bytes: number }[];
};

export type ArchiveModule = {
  extract(archive: string, into: string, maxEntries: number, maxBytes: number): Promise<NativeExtracted>;
};

export function archiveModule(): ArchiveModule {
  return requireNativeModule<ArchiveModule>('UwArchive');
}
