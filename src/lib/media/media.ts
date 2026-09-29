import { packsDirectory } from '../domain/pack';
import { defineModule, ownsNothing } from '../module';
import { impactImagesDirectory } from '../partners/partners';

export type MediaApi = {
  uriOf(path: string): string | undefined;
};

export const mediaDirectories: readonly string[] = Object.freeze([packsDirectory, impactImagesDirectory]);

function segments(path: string): string[] {
  return path.split('/').filter((part) => part !== '');
}

export function isMediaPath(path: string): boolean {
  const parts = segments(path);
  if (parts.some((part) => part.startsWith('.'))) {
    return false;
  }
  return mediaDirectories.some((directory) => {
    const root = segments(directory);
    return parts.length > root.length && root.every((part, index) => parts[index] === part);
  });
}

export const mediaModule = defineModule<MediaApi>({
  events: [],
  owns: ownsNothing,
  create(context) {
    const { files } = context.ports;
    return {
      api: {
        uriOf: (path) => (isMediaPath(path) ? files.uriOf(path) : undefined),
      },
    };
  },
});
