import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { GlassButton, GlassSurface } from '@shared/glass';
import { useService } from '@shared/kernel';
import { useTheme } from '@shared/theme';
import { useAsyncValue } from '@shared/ui';
import { createAboutService, type ImpactStoryView } from '../service';
import { Card, SectionTitle } from './parts/Card';
import { Line } from './parts/Line';
import { LinkRow } from './parts/LinkRow';
import { Screen } from './parts/Screen';
import { StoryWell } from './parts/StoryWell';

export default function AboutScreen() {
  const service = useService(createAboutService);
  const router = useRouter();
  const theme = useTheme();
  const [focus, setFocus] = useState(0);
  useFocusEffect(useCallback(() => setFocus((current) => current + 1), []));
  useAsyncValue(() => service.refreshStories(), [focus]);
  const words = service.words();
  const summary = service.summary();
  const opensBrowser = words.t('common.opensBrowser');
  const stories = summary.stories.flatMap((story) => service.story(story.slug) ?? []);

  return (
    <Screen
      brand
      overline={summary.overline}
      title={summary.title}
      back={{ label: words.t('common.back'), onPress: () => router.back() }}
    >
      <View style={[styles.stats, { gap: theme.space.sp4 }]}>
        {summary.stats.map((stat) => (
          <GlassSurface
            key={stat.label}
            level={2}
            blur="strong"
            radius="md"
            shadow="rest"
            accessible
            accessibilityLabel={`${stat.value} ${stat.label}`}
            style={[styles.stat, { padding: theme.space.sp7, gap: theme.space.sp3 }]}
          >
            <Line role="hero" tone="title" brand>
              {String(stat.value)}
            </Line>
            <Line role="caption" tone="body" brand>
              {stat.label}
            </Line>
          </GlassSurface>
        ))}
      </View>
      <Card level={1}>
        <SectionTitle brand>{words.t('about.publishedBy')}</SectionTitle>
        <Line role="body" tone="body" brand>
          {summary.publishedBy}
        </Line>
        {summary.publishers.map((publisher) => (
          <Line key={publisher} role="label" tone="title" brand>
            {publisher}
          </Line>
        ))}
      </Card>
      {summary.byType.length === 0 ? null : (
        <Card level={1}>
          <SectionTitle brand>{words.t('about.byType')}</SectionTitle>
          {summary.byType.map((row) => (
            <View key={row.type} style={[styles.typeRow, { gap: theme.space.sp4 }]}>
              <Line role="label" tone="title" brand style={styles.grow}>
                {row.title}
              </Line>
              <Line role="caption" tone="dim" brand>
                {words.t('common.joined', {
                  first: `${row.releases} ${words.plural('about.stats.releases', row.releases)}`,
                  second: `${row.languages} ${words.plural('about.stats.languages', row.languages)}`,
                })}
              </Line>
            </View>
          ))}
        </Card>
      )}
      {stories.length === 0 ? null : <SectionTitle brand>{words.t('about.stories')}</SectionTitle>}
      {stories.map((story) => (
        <StoryCard
          key={story.slug}
          story={story}
          open={words.t('common.open')}
          onOpen={() => router.push(`/impact/${story.slug}`)}
        />
      ))}
      <Card level={2}>
        <SectionTitle brand>{summary.partner.title}</SectionTitle>
        <Line role="body" tone="title" brand>
          {summary.partner.body}
        </Line>
        <GlassButton
          full
          variant="dark"
          accessibilityLabel={summary.partner.link}
          accessibilityHint={opensBrowser}
          onPress={() => router.push(summary.partner.url)}
        >
          <Line role="label" tone="onInverse" brand weight={theme.fontWeight.fwSemibold}>
            {summary.partner.link}
          </Line>
        </GlassButton>
      </Card>
      <SectionTitle brand>{words.t('about.next')}</SectionTitle>
      {summary.links.map((link) => (
        <LinkRow
          key={link.id}
          brand
          title={link.title}
          about={link.about}
          hint={opensBrowser}
          onPress={() => router.push(link.url)}
        />
      ))}
    </Screen>
  );
}

function StoryCard({ story, open, onOpen }: { story: ImpactStoryView; open: string; onOpen: () => void }) {
  const theme = useTheme();
  return (
    <GlassSurface
      level={2}
      blur="strong"
      shadow="card"
      style={{ padding: theme.space.sp5, gap: theme.space.sp4 }}
    >
      <StoryWell {...(story.image === undefined ? {} : { image: story.image, label: story.title })}>
        <Line role="overline" tone="onImage" brand>
          {story.overline}
        </Line>
        <Line role="cardTitle" tone="onImage" brand>
          {story.title}
        </Line>
      </StoryWell>
      <View style={{ gap: theme.space.sp3, paddingHorizontal: theme.space.sp4 }}>
        {story.body[0] === undefined ? null : (
          <Line role="label" tone="body" brand>
            {story.body[0]}
          </Line>
        )}
        <Line role="caption" tone="dim" brand>
          {story.securityNote}
        </Line>
      </View>
      <GlassButton full accessibilityLabel={`${open}, ${story.title}`} onPress={onOpen}>
        <Line role="label" tone="title" brand weight={theme.fontWeight.fwSemibold}>
          {open}
        </Line>
      </GlassButton>
    </GlassSurface>
  );
}

const styles = StyleSheet.create({
  stats: { flexDirection: 'row', flexWrap: 'wrap' },
  stat: { flexGrow: 1, flexBasis: 0, minWidth: '28%' },
  typeRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  grow: { flexGrow: 1, flexShrink: 1 },
});
