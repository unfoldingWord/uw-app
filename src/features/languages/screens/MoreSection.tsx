import { GlassButton } from '@shared/glass';
import { useService } from '@shared/kernel';
import { Badge, Notice, Row, SectionTitle, ThemedText } from '@shared/ui';
import { createLanguagesService, type MoreDownload } from '../service';
import type { Failures } from './outcomes';

export type MoreSectionProps = {
  autonym: string;
  failures: Failures;
  onInstall: (key: string, item: MoreDownload) => Promise<void>;
};

function moreKey(item: MoreDownload): string {
  return `more:${item.release.publisher}/${item.release.resource}`;
}

export function MoreSection({ autonym, failures, onInstall }: MoreSectionProps) {
  const languages = useService(createLanguagesService);
  const words = languages.words();
  const list = languages.more();
  if (list.length === 0) {
    return null;
  }
  return (
    <>
      <SectionTitle>{words.t('languages.more.title')}</SectionTitle>
      <ThemedText variant="caption" tone="dim">
        {words.t('languages.more.about', { language: autonym })}
      </ThemedText>
      {list.map((item) => {
        const key = moreKey(item);
        const failure = failures[key];
        return (
          <Row
            key={key}
            title={item.title}
            detail={item.detail}
            trailing={
              item.installed ? (
                <Badge label={words.t('common.offline')} />
              ) : (
                <GlassButton
                  size="sm"
                  variant="dark"
                  accessibilityHint={item.title}
                  onPress={() => onInstall(key, item)}
                >
                  {words.t('languages.download')}
                </GlassButton>
              )
            }
            below={failure === undefined ? undefined : <Notice text={words.t(`failure.${failure}`)} />}
          />
        );
      })}
    </>
  );
}
