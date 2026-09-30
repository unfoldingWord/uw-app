export type SystemPath = { path: string; initial: boolean };

export const openedParam = 'opened';

const handedFile = /^(file|content):\/\//i;

export function redirectSystemPath({ path }: SystemPath): string {
  return handedFile.test(path) ? `/languages?${openedParam}=${encodeURIComponent(path)}` : path;
}
