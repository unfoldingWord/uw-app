import type { PackId, PackKind, ResourceRow } from '../domain/pack';
import type { Release } from '../domain/release';

export type ScriptDirection = 'ltr' | 'rtl';

export type ReleaseAsset = { name: string; url: string; bytes: number | undefined };

export const builtKinds = ['images', 'audio'] as const;

export type BuiltKind = (typeof builtKinds)[number];

export type CatalogRelease = Release & {
  row: ResourceRow | undefined;
  kind: PackKind | undefined;
  pack: PackId | undefined;
  bytes: number | undefined;
  autonym: string;
  direction: ScriptDirection;
  assets: readonly ReleaseAsset[];
  built: BuiltKind | undefined;
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
