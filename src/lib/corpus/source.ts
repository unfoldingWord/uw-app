import { admittedRows, rowFor, type ListedIngredient, type RowId } from '../burrito/flavors';
import { ingredientsDirectory, metadataPath } from '../burrito/files';
import { isRecord, readProvenance, type BurritoMetadata, type IngredientEntry } from '../burrito/metadata';
import type { Provenance } from '../domain/provenance';
import type { Files } from '../ports';
import type { CorpusBurrito, CorpusSource, Direction } from './types';

export const packsDirectory = 'packs';

export const unrecordedCommit = 'unrecorded';

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

export function rowOf(reader: BurritoReader): RowId | undefined {
  const flavorType = reader.metadata.type.flavorType;
  return rowFor(admittedRows, flavorType.name, flavorType.flavor.name, reader.ingredients)?.id;
}

const deepestBurrito = 4;

export function packDirectory(pack: string): string {
  return `${packsDirectory}/${pack.split(':').join('/')}`;
}

async function burritoRoots(files: Files, path: string, depth: number): Promise<string[]> {
  if (await files.exists(`${path}/${metadataPath}`)) {
    return [path];
  }
  if (depth === 0 || !(await files.exists(path))) {
    return [];
  }
  const found: string[] = [];
  for (const entry of await files.list(path)) {
    if (entry.kind === 'directory' && !entry.name.startsWith('.')) {
      found.push(...(await burritoRoots(files, `${path}/${entry.name}`, depth - 1)));
    }
  }
  return found;
}

function ingredientBytes(metadata: BurritoMetadata): number {
  return Object.values(metadata.ingredients).reduce(
    (sum, entry) => sum + (typeof entry.size === 'number' ? entry.size : 0),
    0,
  );
}

export async function describePack(files: Files, pack: string): Promise<CorpusSource> {
  const burritos: CorpusBurrito[] = [];
  for (const root of await burritoRoots(files, packDirectory(pack), deepestBurrito)) {
    const reader = await openBurrito(files, root);
    const row = reader === undefined ? undefined : rowOf(reader);
    const read = reader === undefined ? undefined : readProvenance(reader.metadata);
    if (reader !== undefined && row !== undefined && read !== undefined) {
      burritos.push({
        root,
        row,
        publisher: read.publisher,
        resource: read.resource,
        language: read.language,
        tag: read.tag,
        commit: read.commit ?? '',
        bytes: ingredientBytes(reader.metadata),
      });
    }
  }
  return { pack, burritos };
}
