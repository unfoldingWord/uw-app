import { describe, expect, it } from 'vitest';
import type { CatalogRelease } from '../catalog/types';
import { packIdOf, packKindOf, type ResourceRow } from '../domain/pack';
import { archiveUrlOf } from '../domain/release';
import { defaultReleases, optionalReleases } from './plan';

function release(publisher: string, resource: string, row: ResourceRow, language: string): CatalogRelease {
  const kind = packKindOf(row, language);
  return {
    publisher,
    resource,
    language,
    tag: 'v1',
    commit: 'c0ffee',
    title: resource,
    subject: row,
    archiveUrl: archiveUrlOf({ publisher, resource, tag: 'v1' }),
    published: '',
    row,
    kind,
    pack: packIdOf(kind, language, resource),
    bytes: undefined,
    autonym: language,
    direction: 'ltr',
  };
}

const keys = (releases: readonly CatalogRelease[]) =>
  releases.map((item) => `${item.publisher}/${item.resource}`).sort();

describe('the default pack (LA-2, ST-3)', () => {
  it('holds the preferred publisher’s own literal and simplified pair and leaves other texts optional', () => {
    const english = [
      release('unfoldingWord', 'en_ult', 'text', 'en'),
      release('unfoldingWord', 'en_ust', 'text', 'en'),
      release('unfoldingWord', 'en_t4t', 'text', 'en'),
      release('Worldview', 'en_bsb', 'text', 'en'),
      release('unfoldingWord', 'en_tn', 'notes', 'en'),
      release('unfoldingWord', 'en_obs-tf', 'formation', 'en'),
    ];
    expect(keys(defaultReleases(english, 'language:en'))).toEqual([
      'unfoldingWord/en_tn',
      'unfoldingWord/en_ult',
      'unfoldingWord/en_ust',
    ]);
    expect(keys(optionalReleases(english, 'language:en'))).toEqual([
      'Worldview/en_bsb',
      'unfoldingWord/en_obs-tf',
      'unfoldingWord/en_t4t',
    ]);
  });

  it('takes a gateway organization’s glt and gst when unfoldingWord has no pair', () => {
    const spanish = [
      release('es-419_gl', 'es-419_glt', 'text', 'es-419'),
      release('es-419_gl', 'es-419_gst', 'text', 'es-419'),
      release('Berean', 'es-419_bes', 'text', 'es-419'),
    ];
    expect(keys(defaultReleases(spanish, 'language:es-419'))).toEqual([
      'es-419_gl/es-419_glt',
      'es-419_gl/es-419_gst',
    ]);
  });

  it('never makes a third-party text the default reading', () => {
    const arabic = [
      release('Arabic-Bible', 'ar_avd', 'text', 'ar'),
      release('ar_gl', 'ar_obs', 'stories', 'ar'),
    ];
    expect(keys(defaultReleases(arabic, 'language:ar'))).toEqual(['ar_gl/ar_obs']);
    expect(keys(optionalReleases(arabic, 'language:ar'))).toEqual(['Arabic-Bible/ar_avd']);
  });
});

describe('the publisher of a shared resource name (#17)', () => {
  it('prefers unfoldingWord, then the gateway organization, then Door43-Catalog, then others alphabetically', () => {
    const stories = [
      release('BSA', 'es-419_obs', 'stories', 'es-419'),
      release('Door43-Catalog', 'es-419_obs', 'stories', 'es-419'),
      release('es-419_gl', 'es-419_obs', 'stories', 'es-419'),
    ];
    expect(keys(defaultReleases(stories, 'language:es-419'))).toEqual(['es-419_gl/es-419_obs']);
    expect(keys(optionalReleases(stories, 'language:es-419'))).toEqual([
      'BSA/es-419_obs',
      'Door43-Catalog/es-419_obs',
    ]);

    const withUnfoldingWord = [...stories, release('unfoldingWord', 'es-419_obs', 'stories', 'es-419')];
    expect(keys(defaultReleases(withUnfoldingWord, 'language:es-419'))).toEqual(['unfoldingWord/es-419_obs']);

    const malayalam = [
      release('OBS-TLF', 'ml_obs', 'stories', 'ml'),
      release('Door43-Catalog', 'ml_obs', 'stories', 'ml'),
    ];
    expect(keys(defaultReleases(malayalam, 'language:ml'))).toEqual(['Door43-Catalog/ml_obs']);

    const kazakh = [
      release('Sherzat', 'kk_obs', 'stories', 'kk'),
      release('kk_gt_final', 'kk_obs', 'stories', 'kk'),
    ];
    expect(keys(defaultReleases(kazakh, 'language:kk'))).toEqual(['kk_gt_final/kk_obs']);
  });
});
