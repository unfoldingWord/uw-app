import { useRouter } from 'expo-router';
import { useCallback } from 'react';
import { FlatList } from 'react-native';
import { GlassButton } from '@shared/glass';
import { useService } from '@shared/kernel';
import { Card, Gap, Loading, Screen, ThemedText } from '@shared/ui';
import { createFormationService, type StoryContents, type StoryTitle } from '../service';
import { StoryRow } from './parts/StoryList';
import { useLoad } from './parts/useLoad';
import { storyHref } from './parts/wording';

const noStories: readonly StoryTitle[] = [];

export default function StoriesScreen() {
  const service = useService(createFormationService);
  const router = useRouter();
  const words = service.words();
  const load = useCallback(() => service.contents(), [service]);
  const loaded = useLoad<StoryContents>(load);
  const contents = loaded.value;
  const stories = contents?.state === 'ready' ? contents.stories : noStories;
  const languageName =
    contents === undefined || contents.state === 'no-language' ? '' : service.languageName(contents.language);
  const back = {
    label: words.t('common.back'),
    onPress: () => (router.canGoBack() ? router.back() : router.navigate('/formation')),
  };

  return (
    <Screen
      title={words.t('formation.stories')}
      subtitle={languageName === '' ? undefined : languageName}
      back={back}
      list={(frame) => (
        <FlatList
          {...frame.props}
          data={stories}
          keyExtractor={(story) => String(story.number)}
          renderItem={({ item }) => (
            <Card level={1} compact padding="none">
              <StoryRow
                words={words}
                story={item}
                total={stories.length}
                onChoose={(story) => router.push(storyHref(story))}
              />
            </Card>
          )}
          ItemSeparatorComponent={() => <Gap size={frame.gap} />}
          ListEmptyComponent={
            contents === undefined ? (
              loaded.loading ? (
                <Loading label={words.t('common.busy')} />
              ) : null
            ) : contents.state === 'no-language' ? (
              <Card level={1}>
                <ThemedText variant="body" tone="title">
                  {words.t('formation.stories.noLanguage')}
                </ThemedText>
                <GlassButton variant="dark" onPress={() => router.push('/languages')}>
                  {words.t('formation.stories.chooseLanguage')}
                </GlassButton>
              </Card>
            ) : contents.state === 'not-downloaded' ? (
              <Card level={1}>
                <ThemedText variant="body" tone="title">
                  {words.t('state.notDownloaded', { language: languageName })}
                </ThemedText>
                <GlassButton variant="dark" onPress={() => router.push('/languages')}>
                  {words.t('state.notDownloaded.action', { language: languageName })}
                </GlassButton>
              </Card>
            ) : null
          }
          ListFooterComponent={
            loaded.failure === undefined ? null : (
              <ThemedText variant="caption" tone="body">
                {words.t(`failure.${loaded.failure}`)}
              </ThemedText>
            )
          }
        />
      )}
    />
  );
}
