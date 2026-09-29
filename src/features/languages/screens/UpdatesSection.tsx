import type { PackId } from '@lib/domain/pack';
import { GlassButton } from '@shared/glass';
import { useService } from '@shared/kernel';
import { Notice, Row, SectionTitle, useAsyncValue } from '@shared/ui';
import { createLanguagesService, type LanguageRow } from '../service';
import { packName } from './labels';
import type { Failures } from './outcomes';

export type UpdatesSectionProps = {
  version: number;
  rows: readonly LanguageRow[];
  failures: Failures;
  onUpdate: (pack: PackId) => Promise<void>;
};

export function UpdatesSection({ version, rows, failures, onUpdate }: UpdatesSectionProps) {
  const languages = useService(createLanguagesService);
  const words = languages.words();
  const updates = useAsyncValue(() => languages.updates(), [version]);
  const list = updates.value ?? [];
  if (list.length === 0) {
    return null;
  }
  return (
    <>
      <SectionTitle>{words.t('languages.update')}</SectionTitle>
      {list.map((update) => {
        const title = packName(words, rows, update);
        const failure = failures[update.pack];
        const tags = update.resources.map((resource) => resource.available.tag).join(' ');
        return (
          <Row
            key={update.pack}
            title={title}
            detail={words.t('common.joined', {
              first: words.plural('languages.resources', update.resources.length),
              second: tags,
            })}
            trailing={
              <GlassButton
                size="sm"
                variant="dark"
                accessibilityHint={title}
                onPress={() => onUpdate(update.pack)}
              >
                {words.t('languages.update')}
              </GlassButton>
            }
            below={failure === undefined ? undefined : <Notice text={words.t(`failure.${failure}`)} />}
          />
        );
      })}
    </>
  );
}
