import { languagePackId } from '../domain/pack';
import { compareText } from '../order';
import { defaultReleases } from '../packs/plan';
import { englishNameOf } from './languageNames';
import { compareReleases } from './normalize';
import type { CatalogLanguage, CatalogRelease, LanguageName } from './types';

export function languagesOf(
  releases: readonly CatalogRelease[],
  installed: ReadonlySet<string>,
  names: ReadonlyMap<string, LanguageName> = new Map(),
): CatalogLanguage[] {
  const byLanguage = new Map<string, CatalogRelease[]>();
  for (const release of releases) {
    if (release.kind === 'language') {
      const items = byLanguage.get(release.language);
      if (items === undefined) {
        byLanguage.set(release.language, [release]);
      } else {
        items.push(release);
      }
    }
  }
  return [...byLanguage.entries()]
    .map(([language, items]) => {
      const [first] = [...items].sort(compareReleases);
      const autonym = first?.autonym ?? language;
      const named = names.get(language);
      return {
        language,
        autonym,
        englishName: named?.englishName ?? englishNameOf(language, autonym),
        direction: named?.direction ?? first?.direction ?? 'ltr',
        resources: offeredResources(items, language),
        installed: installed.has(language),
      };
    })
    .sort(
      (left, right) =>
        compareText(left.englishName, right.englishName) || compareText(left.language, right.language),
    );
}

export function nameOf(
  languages: readonly CatalogLanguage[],
  names: ReadonlyMap<string, LanguageName>,
  language: string,
): LanguageName {
  const listed = languages.find((item) => item.language === language);
  if (listed !== undefined) {
    return { autonym: listed.autonym, englishName: listed.englishName, direction: listed.direction };
  }
  const named = names.get(language);
  if (named !== undefined) {
    return named;
  }
  const englishName = englishNameOf(language, language);
  return { autonym: englishName, englishName, direction: 'ltr' };
}

function offeredResources(releases: readonly CatalogRelease[], language: string): number {
  return defaultReleases(releases, languagePackId(language)).length;
}

function folded(value: string): string {
  return value.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim();
}

export function searchLanguages(
  languages: readonly CatalogLanguage[],
  query: string,
): readonly CatalogLanguage[] {
  const wanted = folded(query);
  if (wanted === '') {
    return languages;
  }
  return languages.filter(
    (item) =>
      folded(item.autonym).includes(wanted) ||
      folded(item.englishName).includes(wanted) ||
      item.language.toLowerCase().startsWith(wanted),
  );
}
