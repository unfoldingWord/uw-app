import { useLocalSearchParams, useRouter } from 'expo-router';
import { useService } from '@shared/kernel';
import { EmptyState, Row, Screen } from '@shared/ui';
import { createLanguagesService } from '../service';
import { downloadedResourceHref } from './routes';

export default function DownloadedResourcesScreen() {
  const languages = useService(createLanguagesService);
  const router = useRouter();
  const words = languages.words();
  const params = useLocalSearchParams<{ language: string }>();
  const language = typeof params.language === 'string' ? params.language : '';
  const named = languages.downloaded().find((item) => item.language === language);
  const autonym = named?.autonym ?? language;
  const resources = languages.resources(language);
  return (
    <Screen
      overline={named?.resources ?? words.t('languages.downloaded.title')}
      title={autonym}
      back={{ label: words.t('common.back'), onPress: () => router.back() }}
    >
      {resources.length === 0 ? (
        <EmptyState icon="folder" title={words.t('state.notDownloaded', { language: autonym })} />
      ) : null}
      {resources.map((item) => (
        <Row
          key={`${item.publisher}/${item.resource}`}
          title={item.title}
          detail={item.detail}
          chevron
          press={{
            accessibilityLabel: item.title,
            accessibilityHint: item.detail,
            onPress: () => router.push(downloadedResourceHref(language, item.publisher, item.resource)),
          }}
        />
      ))}
    </Screen>
  );
}
