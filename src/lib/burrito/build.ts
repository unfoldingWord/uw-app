import { ingredientsDirectory, md5Hex, metadataPath, utf8, type BurritoFiles } from './files';
import { mimeTypes } from './flavors';
import {
  doorAuthority,
  doorAuthorityId,
  type BurritoLanguage,
  type BurritoMetadata,
  type IngredientEntry,
  type JsonValue,
  type LocalizedText,
  type Scope,
} from './metadata';
import { burritoFormat } from './validate';

export type IngredientInput = {
  readonly path: string;
  readonly bytes: Uint8Array;
  readonly mimeType: string;
  readonly scope?: Scope;
};

export type BurritoInput = {
  readonly publisher: string;
  readonly resource: string;
  readonly commit: string;
  readonly dateCreated: string;
  readonly generator: { readonly softwareName: string; readonly softwareVersion: string };
  readonly language: BurritoLanguage;
  readonly name: LocalizedText;
  readonly abbreviation: LocalizedText;
  readonly flavorType: string;
  readonly flavor: string;
  readonly flavorDetails?: { readonly [detail: string]: JsonValue };
  readonly currentScope?: Scope;
  readonly licence: { readonly statement: string; readonly text: string; readonly bare?: boolean };
  readonly ingredients: readonly IngredientInput[];
};

const scriptureBurritoVersion = '1.0.0';
export const licenceIngredient = 'LICENSE.md';

export type MetadataInput = Omit<BurritoInput, 'ingredients' | 'licence'> & {
  readonly licence: Omit<BurritoInput['licence'], 'text'>;
};

function entryFor(ingredient: IngredientInput): IngredientEntry {
  return {
    checksum: { md5: md5Hex(ingredient.bytes) },
    mimeType: ingredient.mimeType,
    size: ingredient.bytes.length,
    ...(ingredient.scope ? { scope: ingredient.scope } : {}),
  };
}

export function buildBurrito(input: BurritoInput): BurritoFiles {
  const ingredients: IngredientInput[] = [
    ...input.ingredients,
    { path: licenceIngredient, bytes: utf8(input.licence.text), mimeType: mimeTypes.markdown },
  ];
  const files = new Map<string, Uint8Array>();
  const entries: Record<string, IngredientEntry> = {};
  for (const ingredient of [...ingredients].sort((a, b) =>
    a.path < b.path ? -1 : a.path > b.path ? 1 : 0,
  )) {
    const key = `${ingredientsDirectory}${ingredient.path}`;
    entries[key] = entryFor(ingredient);
    files.set(key, ingredient.bytes);
  }
  const metadata = burritoMetadata(input, entries);
  files.set(metadataPath, utf8(`${JSON.stringify(metadata, null, 2)}\n`));
  return files;
}

export function burritoMetadata(
  input: MetadataInput,
  entries: Readonly<Record<string, IngredientEntry>>,
): BurritoMetadata {
  const repository = `${input.publisher}/${input.resource}`;
  return {
    format: burritoFormat,
    meta: {
      version: scriptureBurritoVersion,
      category: 'source',
      generator: { ...input.generator, userName: '' },
      defaultLocale: input.language.tag,
      dateCreated: input.dateCreated,
      normalization: 'NFC',
    },
    idAuthorities: {
      [doorAuthority]: { id: doorAuthorityId, name: { en: 'Door43 Content Service' } },
    },
    identification: {
      primary: {
        [doorAuthority]: { [repository]: { revision: input.commit, timestamp: input.dateCreated } },
      },
      name: input.name,
      description: input.name,
      abbreviation: input.abbreviation,
    },
    languages: [input.language],
    type: {
      flavorType: {
        name: input.flavorType,
        flavor: { name: input.flavor, ...input.flavorDetails },
        ...(input.currentScope ? { currentScope: input.currentScope } : {}),
      },
    },
    confidential: false,
    copyright: {
      shortStatements: [
        input.licence.bare === true
          ? { statement: input.licence.statement }
          : { statement: input.licence.statement, mimetype: 'text/plain', lang: input.language.tag },
      ],
    },
    ingredients: { ...entries },
  };
}
