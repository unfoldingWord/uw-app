import { View } from 'react-native';
import { GlassButton } from '@shared/glass';
import { useService } from '@shared/kernel';
import { useTheme } from '@shared/theme';
import { Notice, Row, SectionTitle } from '@shared/ui';
import { createLanguagesService, type ImportOutcome } from '../service';
import type { Failures } from './outcomes';

const pickedKey = 'importPicked';
export const openedKey = 'importOpened';

export type RunImport = (key: string, action: () => Promise<ImportOutcome>) => Promise<void>;

export type OpenedFileProps = {
  opened: string;
  failures: Failures;
  onImport: RunImport;
  onDismiss: () => void;
};

export function OpenedFile({ opened, failures, onImport, onDismiss }: OpenedFileProps) {
  const languages = useService(createLanguagesService);
  const theme = useTheme();
  const words = languages.words();
  const failure = failures[openedKey];
  return (
    <Row
      icon="folder"
      title={words.t('languages.import.opened', { name: languages.openedName(opened) })}
      selected
      below={
        <View style={{ gap: theme.space.sp4 }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.space.sp4 }}>
            <GlassButton
              size="sm"
              variant="dark"
              onPress={() => onImport(openedKey, () => languages.importOpened(opened))}
            >
              {words.t('languages.import.install')}
            </GlassButton>
            <GlassButton size="sm" variant="quiet" onPress={onDismiss}>
              {words.t('common.cancel')}
            </GlassButton>
          </View>
          {failure === undefined ? null : <Notice text={words.t(`failure.${failure}`)} />}
        </View>
      }
    />
  );
}

export type ImportSectionProps = { imported: boolean; failures: Failures; onImport: RunImport };

export function ImportSection({ imported, failures, onImport }: ImportSectionProps) {
  const languages = useService(createLanguagesService);
  const words = languages.words();
  const failure = failures[pickedKey];
  return (
    <>
      <SectionTitle>{words.t('languages.import.title')}</SectionTitle>
      <Row
        title={words.t('languages.import')}
        detail={words.t('languages.import.about')}
        trailing={
          <GlassButton
            size="sm"
            variant="quiet"
            accessibilityHint={words.t('languages.import.about')}
            onPress={() => onImport(pickedKey, () => languages.importFile())}
          >
            {words.t('common.open')}
          </GlassButton>
        }
        below={
          failure !== undefined ? (
            <Notice text={words.t(`failure.${failure}`)} />
          ) : imported ? (
            <Notice tone="ready" text={words.t('languages.import.done')} />
          ) : undefined
        }
      />
    </>
  );
}
