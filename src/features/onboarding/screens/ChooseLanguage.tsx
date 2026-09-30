import { useState } from 'react';
import { GlassButton, GlassInput, Icon } from '@shared/glass';
import { useService } from '@shared/kernel';
import { useTheme } from '@shared/theme';
import { EmptyState, Header, Notice, Row, ScreenScaffold, useAsyncValue } from '@shared/ui';
import { createOnboardingService } from '../service';

export type ChooseLanguageProps = {
  onBack: () => void;
  onChoose: (language: string) => Promise<void>;
};

export function ChooseLanguage({ onBack, onChoose }: ChooseLanguageProps) {
  const onboarding = useService(createOnboardingService);
  const theme = useTheme();
  const words = onboarding.words();
  const [query, setQuery] = useState('');
  const refreshed = useAsyncValue(() => onboarding.refresh(), []);
  const languages = onboarding.languages(query);
  const outcome = refreshed.value;
  const failure = outcome !== undefined && !outcome.ok ? outcome.code : undefined;

  return (
    <ScreenScaffold
      header={
        <Header
          back={{ label: words.t('common.back'), onPress: onBack }}
          overline={words.t('languages.overline.onboarding')}
          title={words.t('languages.title')}
        />
      }
    >
      <GlassInput
        accessibilityLabel={words.t('languages.search')}
        placeholder={words.t('languages.search')}
        value={query}
        onChangeText={setQuery}
        autoCorrect={false}
        leading={<Icon name="search" size={theme.fontSize.fsBody} />}
        returnKeyType="search"
      />
      {failure === undefined ? null : (
        <Notice
          text={words.t(failure === 'http.offline' ? 'languages.offline' : `failure.${failure}`)}
          action={
            <GlassButton size="sm" variant="glass" onPress={() => refreshed.reload()}>
              {words.t('common.retry')}
            </GlassButton>
          }
        />
      )}
      {languages.length === 0 && query.trim() !== '' ? (
        <EmptyState icon="search" title={words.t('languages.noMatch', { query: query.trim() })} />
      ) : null}
      {languages.map((language) => (
        <Row
          key={language.language}
          title={language.autonym}
          detail={language.englishName}
          chevron
          press={{
            accessibilityLabel: words.t('languages.select', { language: language.autonym }),
            onPress: () => onChoose(language.language),
          }}
        />
      ))}
    </ScreenScaffold>
  );
}
