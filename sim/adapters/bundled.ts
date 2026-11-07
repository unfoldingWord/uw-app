import type { FailureCode } from '@lib/domain/failures';
import type { Bundled, BundledArchive } from '@lib/ports';
import { portError } from './errors';

export type BundledContent = {
  readonly archives: readonly BundledArchive[];
  readonly bytes: ReadonlyMap<string, Uint8Array>;
};

export type BundledHandOff = { offerExternal(external: string, data: Uint8Array): void };

export type MemoryBundled = Bundled & {
  failNext(code: FailureCode): void;
  replace(file: string, data: Uint8Array): void;
  opened(): readonly string[];
};

const bundledUriScheme = 'bundled://app/';

const noBundledContent: BundledContent = { archives: [], bytes: new Map() };

export function createMemoryBundled(
  files: BundledHandOff,
  content: BundledContent = noBundledContent,
): MemoryBundled {
  const bytes = new Map(content.bytes);
  const opened: string[] = [];
  let failure: FailureCode | undefined;
  return {
    archives: () => content.archives.map((archive) => ({ ...archive })),
    open: async (file) => {
      const refused = failure;
      failure = undefined;
      if (refused !== undefined) {
        throw portError(refused, `the scripted app could not open ${file}`);
      }
      const data = bytes.get(file);
      if (data === undefined) {
        throw portError('files.not-found', `the app carries no ${file}`);
      }
      const uri = `${bundledUriScheme}${file}`;
      files.offerExternal(uri, data);
      opened.push(file);
      return uri;
    },
    failNext: (code) => {
      failure = code;
    },
    replace: (file, data) => {
      bytes.set(file, data.slice());
    },
    opened: () => opened.slice(),
  };
}
