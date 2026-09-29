import type { ListedIngredient } from '../burrito/flavors';
import { ingredientsDirectory, metadataPath } from '../burrito/files';
import { isRecord, type BurritoMetadata, type IngredientEntry } from '../burrito/metadata';
import { unrecordedCommit, type Provenance } from '../domain/provenance';
import type { Files } from '../ports';
import type { CorpusBurrito, Direction } from './types';

export type BurritoReader = {
  readonly root: string;
  readonly metadata: BurritoMetadata;
  readonly ingredients: readonly ListedIngredient[];
  readonly direction: Direction;
  pathOf(key: string): string;
  read(key: string): Promise<string>;
};

export function isSafeIngredientKey(key: string): boolean {
  return (
    key.startsWith(ingredientsDirectory) &&
    !key.startsWith('/') &&
    !key.includes('\\') &&
    key.split('/').every((segment) => segment !== '..' && segment !== '.' && segment !== '')
  );
}

function listed(metadata: BurritoMetadata): ListedIngredient[] {
  return Object.entries(metadata.ingredients).flatMap(([key, entry]: [string, IngredientEntry]) =>
    isSafeIngredientKey(key) && isRecord(entry) && typeof entry.mimeType === 'string'
      ? [{ key, path: key.slice(ingredientsDirectory.length), entry }]
      : [],
  );
}

function parseMetadata(text: string): BurritoMetadata | undefined {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    return undefined;
  }
  if (
    !isRecord(value) ||
    !isRecord(value.ingredients) ||
    !isRecord(value.type) ||
    !Array.isArray(value.languages)
  ) {
    return undefined;
  }
  return value as BurritoMetadata;
}

function titleOf(metadata: BurritoMetadata, language: string): string {
  const names = metadata.identification.name;
  return names[language] ?? names.en ?? Object.values(names)[0] ?? '';
}

export function provenanceOf(burrito: CorpusBurrito, metadata: BurritoMetadata): Provenance | undefined {
  const licence = metadata.copyright.shortStatements[0]?.statement ?? '';
  if (licence.trim() === '') {
    return undefined;
  }
  const title = titleOf(metadata, burrito.language);
  return {
    publisher: burrito.publisher,
    resource: burrito.resource,
    language: burrito.language,
    tag: burrito.tag,
    commit: burrito.commit === '' ? unrecordedCommit : burrito.commit,
    licence,
    title: title === '' ? burrito.resource : title,
  };
}

export async function openBurrito(files: Files, root: string): Promise<BurritoReader | undefined> {
  const text = await files.readText(`${root}/${metadataPath}`);
  const metadata = parseMetadata(text);
  if (metadata === undefined) {
    return undefined;
  }
  const ingredients = listed(metadata);
  const keys = new Set(ingredients.map((ingredient) => ingredient.key));
  const pathOf = (key: string): string => {
    if (!keys.has(key)) {
      throw new Error(`${key} is not an ingredient of ${root}`);
    }
    return `${root}/${key}`;
  };
  return {
    root,
    metadata,
    ingredients,
    direction: metadata.languages[0]?.scriptDirection === 'rtl' ? 'rtl' : 'ltr',
    pathOf,
    read: (key) => files.readText(pathOf(key)),
  };
}
