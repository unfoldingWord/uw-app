export const packKinds = ['language', 'image', 'audio', 'original'] as const;

export type PackKind = (typeof packKinds)[number];

export const packSources = ['catalog', 'peer', 'file'] as const;

export type PackSourceKind = (typeof packSources)[number];

export const resourceRows = [
  'text',
  'notes',
  'wordLinks',
  'questions',
  'articles',
  'stories',
  'storyHelps',
  'formation',
  'audio',
  'images',
] as const;

export type ResourceRow = (typeof resourceRows)[number];

export type PackId = string;

export const imagePackId: PackId = 'image:obs';

const originalLanguages: readonly string[] = Object.freeze(['hbo', 'el-x-koine', 'grc']);

export const packsDirectory = 'packs';

export function languagePackId(language: string): PackId {
  return `language:${language}`;
}

export function audioPackId(language: string, resource: string): PackId {
  return `audio:${language}:${resource}`;
}

export function originalPackId(language: string): PackId {
  return `original:${language}`;
}

const packIdShape = /^(language|image|audio|original)(:[A-Za-z0-9_.-]{1,64}){1,2}$/;

export function isPackId(value: string): boolean {
  return packIdShape.test(value);
}

export function packKindOf(row: ResourceRow, language: string): PackKind {
  if (row === 'images') {
    return 'image';
  }
  if (row === 'audio') {
    return 'audio';
  }
  return row === 'text' && originalLanguages.includes(language) ? 'original' : 'language';
}

export function packIdOf(kind: PackKind, language: string, resource: string): PackId {
  switch (kind) {
    case 'image':
      return imagePackId;
    case 'audio':
      return audioPackId(language, resource);
    case 'original':
      return originalPackId(language);
    case 'language':
      return languagePackId(language);
  }
}

export function packDirectory(pack: PackId): string {
  return [packsDirectory, ...pack.split(':')].join('/');
}
