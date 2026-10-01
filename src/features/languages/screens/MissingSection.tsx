import { GlassButton } from '@shared/glass';
import { useService } from '@shared/kernel';
import { Notice, Row, SectionTitle, useAsyncValue } from '@shared/ui';
import { createLanguagesService } from '../service';
import type { Failures } from './outcomes';

export type MissingSectionProps = {
  version: number;
  language: string | undefined;
  autonym: string;
  failures: Failures;
  onRetry: (language: string) => Promise<void>;
};

export function MissingSection({ version, language, autonym, failures, onRetry }: MissingSectionProps) {
  const languages = useService(createLanguagesService);
  const words = languages.words();
  const missing = useAsyncValue(() => languages.missing(), [version, language]);
  const list = missing.value ?? [];
  if (language === undefined || (list.length === 0 && missing.failure === undefined)) {
    return null;
  }
  const retryFailure = failures[language];
  return (
    <>
      <SectionTitle>{words.t('languages.missing.title')}</SectionTitle>
      <Notice
        tone="progress"
        text={words.t('languages.missing.about', { language: autonym })}
        action={
          <GlassButton
            size="sm"
            variant="dark"
            accessibilityHint={words.t('languages.missing.title')}
            onPress={() => onRetry(language)}
          >
            {words.t('common.retry')}
          </GlassButton>
        }
      />
      {list.map((item) => (
        <Row
          key={`${item.publisher}/${item.resource}`}
          title={item.title}
          detail={item.detail}
          below={item.code === undefined ? undefined : <Notice text={words.t(`failure.${item.code}`)} />}
        />
      ))}
      {missing.failure === undefined ? null : <Notice text={words.t(`failure.${missing.failure}`)} />}
      {retryFailure === undefined ? null : <Notice text={words.t(`failure.${retryFailure}`)} />}
    </>
  );
}
