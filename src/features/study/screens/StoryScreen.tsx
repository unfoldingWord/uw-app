import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback } from 'react';
import { FlatList } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GlassButton, GlassIconButton, GlassSurface, Icon } from '@shared/glass';
import { useService } from '@shared/kernel';
import { useTheme } from '@shared/theme';
import { createStudyService } from '../service';
import { Attribution } from './parts/Attribution';
import { ScreenFrame, TopBar } from './parts/Frame';
import { FramePicture } from './parts/FramePicture';
import { passageHref, studyRoutes } from './parts/routes';
import { Say } from './parts/Say';
import { contentText } from './parts/script';
import { StatePanel } from './parts/StatePanel';
import { useLoaded } from './parts/useLoaded';

function storyNumber(value: string | string[] | undefined): number {
  const text = Array.isArray(value) ? value[0] : value;
  const parsed = Number(text);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 0;
}

export default function StoryScreen() {
  const service = useService(createStudyService);
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ number?: string }>();
  const number = storyNumber(params.number);
  const words = service.words();
  const load = useCallback(() => service.story(number), [service, number]);
  const { value, reload } = useLoaded(load);
  const language = service.language() ?? '';

  if (value === undefined) {
    return <ScreenFrame />;
  }

  if (value.state !== 'story') {
    return (
      <ScreenFrame>
        <TopBar backLabel={words.t('common.back')} />
        {value.state === 'no-language' ? (
          <StatePanel
            message={words.t('study.noLanguage')}
            action={{
              label: words.t('study.noLanguage.action'),
              onPress: () => router.push(studyRoutes.languages),
            }}
          />
        ) : (
          <StatePanel
            message={words.t('article.notDownloaded')}
            action={{ label: words.t('library.open'), onPress: () => router.push(studyRoutes.library) }}
          />
        )}
      </ScreenFrame>
    );
  }

  const { story, saved } = value;
  const [first] = story.references;
  const text = contentText(theme, theme.text.body, {
    language: story.language,
    sample: story.frames[0]?.text ?? story.title,
    direction: story.direction,
  });

  return (
    <ScreenFrame>
      <TopBar
        backLabel={words.t('common.back')}
        overline={words.t('search.kind.story')}
        title={story.title}
        trailing={
          <GlassIconButton
            label={words.t(saved === undefined ? 'common.bookmark.add' : 'common.bookmark.remove')}
            size={theme.space.sp14}
            onPress={async () => {
              if (saved === undefined) {
                await service.save({ target: 'story', story: story.number, language });
              } else {
                await service.unsave(saved.id);
              }
              await reload();
            }}
          >
            <Icon name="bookmark" color={saved === undefined ? undefined : theme.color.accentBlue} />
          </GlassIconButton>
        }
      />
      <FlatList
        data={story.frames}
        keyExtractor={(frame) => String(frame.number)}
        style={{ direction: story.direction }}
        contentContainerStyle={{
          gap: theme.space.gapStack,
          paddingHorizontal: theme.space.gutterScreen,
          paddingTop: theme.space.sp9,
          paddingBottom: insets.bottom + theme.space.sp13,
        }}
        renderItem={({ item }) => (
          <GlassSurface
            level={2}
            blur="strong"
            radius="xl"
            shadow="rest"
            style={{ padding: theme.space.gutterCard, gap: theme.space.sp6 }}
          >
            {item.image === undefined && item.imageName === undefined ? null : (
              <FramePicture
                uri={service.picture(item)}
                label={words.t('study.frame.picture', { number: item.number })}
              />
            )}
            <Say role="body" tone="title" selectable style={text}>
              {item.text}
            </Say>
          </GlassSurface>
        )}
        ListFooterComponent={
          <>
            {first === undefined ? null : (
              <GlassButton
                variant="quiet"
                size="sm"
                onPress={() => router.navigate(passageHref(first))}
                style={{ marginTop: theme.space.sp6 }}
              >
                {story.bibleReference.length === 0 ? first : story.bibleReference}
              </GlassButton>
            )}
            <Attribution words={words} provenance={story.provenance} />
          </>
        }
      />
    </ScreenFrame>
  );
}
