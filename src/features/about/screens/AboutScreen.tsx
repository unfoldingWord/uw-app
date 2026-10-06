import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { GlassButton, GlassSurface } from '@shared/glass';
import { useService } from '@shared/kernel';
import { useTheme } from '@shared/theme';
import { Card, Logo, Screen, SectionTitle, ThemedText, useAsyncValue } from '@shared/ui';
import { createAboutService, type ImpactStoryView } from '../service';
import { LinkRow } from './parts/LinkRow';
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
      <Logo label={words.t('about.logo')} />
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
            <ThemedText variant="hero" tone="title" family="brand">
              {String(stat.value)}
            </ThemedText>
            <ThemedText variant="caption" tone="body" family="brand">
              {stat.label}
            </ThemedText>
          </GlassSurface>
        ))}
      </View>
      <Card level={1}>
        <SectionTitle brand>{words.t('about.publishedBy')}</SectionTitle>
        <ThemedText variant="body" tone="body" family="brand">
          {summary.publishedBy}
        </ThemedText>
        {summary.publishers.map((publisher) => (
          <ThemedText key={publisher} variant="label" tone="title" family="brand">
            {publisher}
          </ThemedText>
        ))}
      </Card>
      {summary.byType.length === 0 ? null : (
        <Card level={1}>
          <SectionTitle brand>{words.t('about.byType')}</SectionTitle>
          {summary.byType.map((row) => (
            <View key={row.type} style={[styles.typeRow, { gap: theme.space.sp4 }]}>
              <ThemedText variant="label" tone="title" family="brand" style={styles.grow}>
                {row.title}
              </ThemedText>
              <ThemedText variant="caption" tone="dim" family="brand">
                {words.t('common.joined', {
                  first: `${row.releases} ${words.plural('about.stats.releases', row.releases)}`,
                  second: `${row.languages} ${words.plural('about.stats.languages', row.languages)}`,
                })}
              </ThemedText>
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
        <ThemedText variant="body" tone="title" family="brand">
          {summary.partner.body}
        </ThemedText>
        <GlassButton
          full
          variant="dark"
          accessibilityLabel={summary.partner.link}
          accessibilityHint={opensBrowser}
          onPress={() => router.push(summary.partner.url)}
        >
          <ThemedText variant="label" tone="inverse" family="brand" weight={theme.fontWeight.fwSemibold}>
            {summary.partner.link}
          </ThemedText>
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
      <ThemedText variant="caption" tone="dim" family="brand">
        {words.t('common.linksOpenBrowser')}
      </ThemedText>
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
        <ThemedText variant="overline" tone="onImage" family="brand">
          {story.overline}
        </ThemedText>
        <ThemedText variant="cardTitle" tone="onImage" family="brand">
          {story.title}
        </ThemedText>
      </StoryWell>
      <View style={{ gap: theme.space.sp3, paddingHorizontal: theme.space.sp4 }}>
        {story.body[0] === undefined ? null : (
          <ThemedText variant="label" tone="body" family="brand">
            {story.body[0]}
          </ThemedText>
        )}
        {story.securityNote === undefined ? null : (
          <ThemedText variant="caption" tone="dim" family="brand">
            {story.securityNote}
          </ThemedText>
        )}
      </View>
      <GlassButton full accessibilityLabel={`${open}, ${story.title}`} onPress={onOpen}>
        <ThemedText variant="label" tone="title" family="brand" weight={theme.fontWeight.fwSemibold}>
          {open}
        </ThemedText>
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
