import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { GlassButton, GlassSurface } from '@shared/glass';
import { useService } from '@shared/kernel';
import { useTheme } from '@shared/theme';
import { Card, Screen, ThemedText } from '@shared/ui';
import { createAboutService, type ImpactStoryView } from '../service';
import { StoryWell } from './parts/StoryWell';

export default function ImpactStoryScreen() {
  const service = useService(createAboutService);
  const router = useRouter();
  const theme = useTheme();
  const words = service.words();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const key = typeof slug === 'string' ? slug : '';
  const [story, setStory] = useState<ImpactStoryView | undefined>(() => service.story(key));

  useEffect(() => {
    let mounted = true;
    void service
      .openStory(key)
      .then((opened) => {
        if (mounted && opened !== undefined) {
          setStory(opened);
        }
      })
      .catch(() => undefined);
    return () => {
      mounted = false;
    };
  }, [service, key]);

  const back = { label: words.t('common.back'), onPress: () => router.back() };
  if (story === undefined) {
    return (
      <Screen brand title={words.t('about.stories')} back={back}>
        <Card level={1}>
          <ThemedText variant="body" tone="body" family="brand">
            {words.t('failure.files.not-found')}
          </ThemedText>
        </Card>
      </Screen>
    );
  }

  return (
    <Screen brand overline={story.overline} title={story.title} back={back}>
      <GlassSurface
        level={2}
        blur="strong"
        shadow="card"
        style={{ padding: theme.space.sp5, gap: theme.space.sp6 }}
      >
        <StoryWell {...(story.image === undefined ? {} : { image: story.image, label: story.title })}>
          <ThemedText variant="overline" tone="onImage" family="brand">
            {story.overline}
          </ThemedText>
        </StoryWell>
        <View style={{ gap: theme.space.sp6, paddingHorizontal: theme.space.sp4 }}>
          {story.body.map((paragraph, index) => (
            <ThemedText key={index} variant="body" tone="title" family="brand">
              {paragraph}
            </ThemedText>
          ))}
          {story.securityNote === undefined ? null : (
            <ThemedText variant="caption" tone="dim" family="brand">
              {story.securityNote}
            </ThemedText>
          )}
        </View>
        <GlassButton
          full
          variant="dark"
          accessibilityLabel={story.readMore}
          accessibilityHint={words.t('common.opensBrowser')}
          onPress={() => router.push(story.link)}
        >
          <ThemedText variant="label" tone="inverse" family="brand" weight={theme.fontWeight.fwSemibold}>
            {story.readMore}
          </ThemedText>
        </GlassButton>
        <ThemedText variant="caption" tone="dim" family="brand">
          {words.t('common.linksOpenBrowser')}
        </ThemedText>
      </GlassSurface>
    </Screen>
  );
}
