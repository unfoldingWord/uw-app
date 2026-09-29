import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { GlassButton, GlassSurface } from '@shared/glass';
import { useService } from '@shared/kernel';
import { useTheme } from '@shared/theme';
import { createAboutService, type ImpactStoryView } from '../service';
import { Card } from './parts/Card';
import { Line } from './parts/Line';
import { Screen } from './parts/Screen';
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
          <Line role="body" tone="body" brand>
            {words.t('failure.files.not-found')}
          </Line>
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
        <StoryWell>
          <Line role="overline" tone="onImage" brand>
            {story.overline}
          </Line>
        </StoryWell>
        <View style={{ gap: theme.space.sp6, paddingHorizontal: theme.space.sp4 }}>
          {story.body.map((paragraph, index) => (
            <Line key={index} role="body" tone="title" brand>
              {paragraph}
            </Line>
          ))}
          <Line role="caption" tone="dim" brand>
            {story.securityNote}
          </Line>
        </View>
        <GlassButton
          full
          variant="dark"
          accessibilityLabel={story.readMore}
          accessibilityHint={words.t('common.opensBrowser')}
          onPress={() => router.push(story.link)}
        >
          <Line role="label" tone="onInverse" brand weight={theme.fontWeight.fwSemibold}>
            {story.readMore}
          </Line>
        </GlassButton>
      </GlassSurface>
    </Screen>
  );
}
