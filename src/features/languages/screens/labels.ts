import type { PackKind } from '@lib/domain/pack';
import type { LanguageRow } from '../service';
import type { LanguagesWords } from '../strings';

export type PackRef = { kind: PackKind; language: string | undefined };

function autonymOf(rows: readonly LanguageRow[], language: string | undefined): string {
  return rows.find((row) => row.language === language)?.autonym ?? language ?? '';
}

export function packName(words: LanguagesWords, rows: readonly LanguageRow[], pack: PackRef): string {
  switch (pack.kind) {
    case 'language':
      return autonymOf(rows, pack.language);
    case 'image':
      return words.t('resource.images');
    case 'audio':
      return words.t('common.joined', {
        first: autonymOf(rows, pack.language),
        second: words.t('resource.audio'),
      });
    case 'original':
      return words.t(pack.language === 'hbo' ? 'resource.hebrew' : 'resource.greek');
  }
}

export function storageLabel(
  words: LanguagesWords,
  rows: readonly LanguageRow[],
  pack: PackRef,
  bytes: number,
): string {
  const size = words.size(bytes);
  switch (pack.kind) {
    case 'language':
      return words.t('storage.language', { language: autonymOf(rows, pack.language), size });
    case 'image':
      return words.t('storage.images', { size });
    case 'audio':
      return words.t('storage.audio', { language: autonymOf(rows, pack.language), size });
    case 'original':
      return words.t('storage.original', { resource: packName(words, rows, pack), size });
  }
}
