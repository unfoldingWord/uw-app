import type { PackId, PackKind, ResourceRow } from '../domain/pack';
import type { Release } from '../domain/release';

export type ScriptDirection = 'ltr' | 'rtl';

export type CatalogRelease = Release & {
  row: ResourceRow | undefined;
  kind: PackKind | undefined;
  pack: PackId | undefined;
  bytes: number | undefined;
  autonym: string;
  direction: ScriptDirection;
};

export type CatalogLanguage = {
  language: string;
  autonym: string;
  englishName: string;
  direction: ScriptDirection;
  resources: number;
  installed: boolean;
};

export type LanguageName = { englishName: string; autonym: string; direction: ScriptDirection };
