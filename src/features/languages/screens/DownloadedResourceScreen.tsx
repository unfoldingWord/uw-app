import { useLocalSearchParams, useRouter } from 'expo-router';
import { GlassButton } from '@shared/glass';
import { useService } from '@shared/kernel';
import { EmptyState, Row, Screen, ThemedText } from '@shared/ui';
import { createLanguagesService } from '../service';

type Params = { language: string; publisher: string; resource: string };

function textOf(value: string | string[] | undefined): string {
  return typeof value === 'string' ? value : '';
}

export default function DownloadedResourceScreen() {
  const languages = useService(createLanguagesService);
  const router = useRouter();
  const words = languages.words();
  const params = useLocalSearchParams<Params>();
  const language = textOf(params.language);
  const autonym = languages.downloaded().find((item) => item.language === language)?.autonym ?? language;
  const resource = languages.resource(language, textOf(params.publisher), textOf(params.resource));
  const back = { label: words.t('common.back'), onPress: () => router.back() };
  if (resource === undefined) {
    return (
      <Screen overline={autonym} title={words.t('languages.downloaded.title')} back={back}>
        <EmptyState icon="folder" title={words.t('languages.resource.missing')} />
      </Screen>
    );
  }
  return (
    <Screen overline={autonym} title={resource.title} back={back}>
      <Row title={resource.version} />
      <Row title={resource.published} />
      <Row title={resource.licence} detail={resource.origin} />
      <GlassButton
        full
        variant="glass"
        accessibilityHint={words.t('common.opensBrowser')}
        onPress={() => router.push(resource.source)}
      >
        {words.t('languages.resource.source')}
      </GlassButton>
      <ThemedText variant="caption" tone="dim" selectable>
        {resource.source}
      </ThemedText>
    </Screen>
  );
}
