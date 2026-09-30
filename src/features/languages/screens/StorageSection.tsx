import { GlassButton } from '@shared/glass';
import { useService } from '@shared/kernel';
import { EmptyState, Notice, Row, SectionTitle, useAsyncValue } from '@shared/ui';
import { createLanguagesService, type LanguageRow } from '../service';
import { storageLabel } from './labels';
import type { Failures } from './outcomes';
import type { PendingRemove } from './RemoveSheet';

export type StorageSectionProps = {
  version: number;
  rows: readonly LanguageRow[];
  failures: Failures;
  onRemove: (pending: PendingRemove) => void;
};

export function StorageSection({ version, rows, failures, onRemove }: StorageSectionProps) {
  const languages = useService(createLanguagesService);
  const words = languages.words();
  const storage = useAsyncValue(() => languages.storage(), [version]);
  const report = storage.value;
  const failure =
    storage.failure === undefined ? null : <Notice text={words.t(`failure.${storage.failure}`)} />;
  if (report === undefined) {
    return failure === null ? null : (
      <>
        <SectionTitle>{words.t('storage.title')}</SectionTitle>
        {failure}
      </>
    );
  }
  return (
    <>
      <SectionTitle>{words.t('storage.title')}</SectionTitle>
      {failure}
      <Row
        title={words.t('storage.summary', {
          used: words.size(report.used),
          free: words.size(report.freeSpace),
        })}
      />
      {report.packs.length === 0 ? <EmptyState icon="folder" title={words.t('storage.empty')} /> : null}
      {report.packs.map((pack) => {
        const label = storageLabel(words, rows, pack, pack.bytes);
        const refused = failures[pack.pack];
        return (
          <Row
            key={pack.pack}
            title={label}
            trailing={
              <GlassButton
                size="sm"
                variant="quiet"
                accessibilityHint={label}
                onPress={() => onRemove({ pack: pack.pack, label })}
              >
                {words.t('languages.remove')}
              </GlassButton>
            }
            below={refused === undefined ? undefined : <Notice text={words.t(`failure.${refused}`)} />}
          />
        );
      })}
    </>
  );
}
