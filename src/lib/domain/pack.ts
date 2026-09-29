export const packKinds = ['language', 'image', 'audio', 'original'] as const;

export const packSources = ['catalog', 'peer', 'file'] as const;

export type PackId = string;

export const imagePackId: PackId = 'image:obs';

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
