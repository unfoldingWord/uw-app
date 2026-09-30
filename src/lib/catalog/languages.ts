import { compareText } from '../order';
import { englishNameOf } from './languageNames';
import { compareReleases } from './normalize';
import type { CatalogLanguage, CatalogRelease } from './types';

export function languagesOf(
  releases: readonly CatalogRelease[],
  installed: ReadonlySet<string>,
): CatalogLanguage[] {
  const byLanguage = new Map<string, CatalogRelease[]>();
  for (const release of releases) {
    if (release.kind === 'language') {
      byLanguage.set(release.language, [...(byLanguage.get(release.language) ?? []), release]);
    }
  }
  return [...byLanguage.entries()]
    .map(([language, items]) => {
      const [first] = [...items].sort(compareReleases);
      const autonym = first?.autonym ?? language;
      return {
        language,
        autonym,
        englishName: englishNameOf(language, autonym),
        direction: first?.direction ?? 'ltr',
        resources: new Set(items.map((item) => item.resource)).size,
        installed: installed.has(language),
      };
    })
    .sort(
      (left, right) =>
        compareText(left.englishName, right.englishName) || compareText(left.language, right.language),
    );
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

export function releasesIn(releases: readonly CatalogRelease[], language: string): CatalogRelease[] {
  return releases.filter((release) => release.language === language).sort(compareReleases);
}
