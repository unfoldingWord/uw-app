import { admittedRows, rowFor, type ListedIngredient, type Row } from './flavors';
import { fromUtf8, ingredientsDirectory, md5Hex, metadataPath, type BurritoFiles } from './files';
import { isRecord, type BurritoMetadata, type IngredientEntry } from './metadata';

type InvalidRule =
  | 'metadata-missing'
  | 'metadata-unreadable'
  | 'metadata-format'
  | 'metadata-field'
  | 'ingredient-field'
  | 'ingredient-missing'
  | 'ingredient-size'
  | 'ingredient-checksum'
  | 'row-ingredients'
  | 'licence';

export type ValidationReport =
  | { readonly ok: true; readonly kind: 'valid'; readonly row: Row; readonly metadata: BurritoMetadata }
  | {
      readonly ok: false;
      readonly kind: 'ignored';
      readonly rule: 'unknown-flavor';
      readonly path: string;
      readonly message: string;
    }
  | {
      readonly ok: false;
      readonly kind: 'invalid';
      readonly rule: InvalidRule;
      readonly path: string;
      readonly message: string;
    };

export type ValidateOptions = { readonly rows?: readonly Row[] };

export const burritoFormat = 'scripture burrito';

const licenceName = /CC BY-SA 4\.0|Creative Commons Attribution-ShareAlike 4\.0/i;
const licenceUrl = /creativecommons\.org\/licenses\/by-sa\/4\.0/i;
const licenceFile = /(^|\/)licen[cs]e(\.[a-z]+)?$/i;
const md5Pattern = /^[0-9a-f]{32}$/;

function invalid(rule: InvalidRule, path: string, message: string): ValidationReport {
  return { ok: false, kind: 'invalid', rule, path, message };
}

function at(value: unknown, path: readonly (string | number)[]): unknown {
  let current: unknown = value;
  for (const step of path) {
    if (typeof step === 'number') {
      current = Array.isArray(current) ? (current[step] as unknown) : undefined;
    } else {
      current = isRecord(current) ? current[step] : undefined;
    }
  }
  return current;
}

function nonEmptyString(value: unknown): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

function localized(value: unknown): boolean {
  return isRecord(value) && Object.values(value).some(nonEmptyString);
}

const requiredFields: readonly {
  path: readonly (string | number)[];
  accepts: (value: unknown) => boolean;
}[] = [
  { path: ['meta', 'version'], accepts: nonEmptyString },
  { path: ['type', 'flavorType', 'name'], accepts: nonEmptyString },
  { path: ['type', 'flavorType', 'flavor', 'name'], accepts: nonEmptyString },
  { path: ['languages', 0, 'tag'], accepts: nonEmptyString },
  { path: ['identification', 'name'], accepts: localized },
  { path: ['identification', 'abbreviation'], accepts: localized },
  { path: ['copyright', 'shortStatements', 0, 'statement'], accepts: nonEmptyString },
  { path: ['ingredients'], accepts: isRecord },
];

function fieldPath(path: readonly (string | number)[]): string {
  return path
    .map((step) => (typeof step === 'number' ? `[${step}]` : `.${step}`))
    .join('')
    .slice(1);
}

function parseJson(bytes: Uint8Array): unknown {
  try {
    return JSON.parse(fromUtf8(bytes)) as unknown;
  } catch {
    return undefined;
  }
}

function ingredientEntry(value: unknown): IngredientEntry | string {
  if (!isRecord(value)) {
    return 'is not an object';
  }
  if (!nonEmptyString(value.mimeType)) {
    return 'has no mimeType';
  }
  if (typeof value.size !== 'number' || !Number.isInteger(value.size) || value.size < 0) {
    return 'has no size';
  }
  const checksum = at(value, ['checksum', 'md5']);
  if (typeof checksum !== 'string' || !md5Pattern.test(checksum)) {
    return 'has no checksum.md5';
  }
  return value as IngredientEntry;
}

function listIngredients(ingredients: Record<string, unknown>): ListedIngredient[] | ValidationReport {
  const listed: ListedIngredient[] = [];
  for (const [key, value] of Object.entries(ingredients)) {
    const entry = ingredientEntry(value);
    if (typeof entry === 'string') {
      return invalid('ingredient-field', key, `ingredient ${key} ${entry}`);
    }
    const path = key.startsWith(ingredientsDirectory) ? key.slice(ingredientsDirectory.length) : key;
    listed.push({ key, path, entry });
  }
  return listed;
}

function checkPresence(
  files: BurritoFiles,
  ingredients: readonly ListedIngredient[],
): ValidationReport | undefined {
  for (const { key, entry } of ingredients) {
    const bytes = files.get(key);
    if (!bytes) {
      return invalid('ingredient-missing', key, `ingredient ${key} is listed but not present`);
    }
    if (bytes.length !== entry.size) {
      return invalid(
        'ingredient-size',
        key,
        `ingredient ${key} is ${bytes.length} bytes, listed as ${entry.size}`,
      );
    }
    const actual = md5Hex(bytes);
    if (actual !== entry.checksum.md5) {
      return invalid(
        'ingredient-checksum',
        key,
        `ingredient ${key} has md5 ${actual}, listed as ${entry.checksum.md5}`,
      );
    }
  }
  return undefined;
}

function hasLicence(
  metadata: unknown,
  files: BurritoFiles,
  ingredients: readonly ListedIngredient[],
): boolean {
  const statements = at(metadata, ['copyright', 'shortStatements']);
  if (
    Array.isArray(statements) &&
    statements.some((item) => licenceName.test(String(at(item, ['statement']))))
  ) {
    return true;
  }
  const licenses = at(metadata, ['copyright', 'licenses']);
  if (Array.isArray(licenses) && licenses.some((item) => licenceUrl.test(String(at(item, ['url']))))) {
    return true;
  }
  return ingredients.some(({ key }) => {
    const bytes = files.get(key);
    return licenceFile.test(key) && bytes !== undefined && licenceName.test(fromUtf8(bytes));
  });
}

export function validate(files: BurritoFiles, options: ValidateOptions = {}): ValidationReport {
  const bytes = files.get(metadataPath);
  if (!bytes) {
    return invalid('metadata-missing', metadataPath, 'the burrito has no metadata.json');
  }
  const metadata = parseJson(bytes);
  if (!isRecord(metadata)) {
    return invalid('metadata-unreadable', metadataPath, 'metadata.json is not a JSON object');
  }
  if (metadata.format !== burritoFormat) {
    return invalid('metadata-format', 'format', `format is not "${burritoFormat}"`);
  }
  for (const field of requiredFields) {
    if (!field.accepts(at(metadata, field.path))) {
      const path = fieldPath(field.path);
      return invalid('metadata-field', path, `metadata.json has no ${path}`);
    }
  }
  const ingredients = listIngredients(metadata.ingredients as Record<string, unknown>);
  if (!Array.isArray(ingredients)) {
    return ingredients;
  }
  const flavorType = String(at(metadata, ['type', 'flavorType', 'name']));
  const flavor = String(at(metadata, ['type', 'flavorType', 'flavor', 'name']));
  const row = rowFor(options.rows ?? admittedRows, flavorType, flavor, ingredients);
  if (!row) {
    return {
      ok: false,
      kind: 'ignored',
      rule: 'unknown-flavor',
      path: 'type.flavorType',
      message: `${flavorType}/${flavor} matches no row of the content contract`,
    };
  }
  const mismatch = row.check(ingredients);
  if (mismatch) {
    return invalid('row-ingredients', mismatch.path, `${row.resource}: ${mismatch.message}`);
  }
  const absent = checkPresence(files, ingredients);
  if (absent) {
    return absent;
  }
  if (!hasLicence(metadata, files, ingredients)) {
    return invalid('licence', 'copyright', 'no licence ingredient or copyright statement names CC BY-SA 4.0');
  }
  return { ok: true, kind: 'valid', row, metadata: metadata as BurritoMetadata };
}
