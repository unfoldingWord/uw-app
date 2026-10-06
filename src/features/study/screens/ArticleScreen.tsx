import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { FailureCode } from '@lib/domain/failures';
import { GlassButton, GlassIconButton, GlassSurface, Icon } from '@shared/glass';
import { useService } from '@shared/kernel';
import { directionOf, useTheme } from '@shared/theme';
import { Notice } from '@shared/ui';
import { createStudyService } from '../service';
import { Attribution } from './parts/Attribution';
import { Blocks } from './parts/Blocks';
import { ScreenFrame, TopBar } from './parts/Frame';
import { articleHref, studyRoutes, useOpenTarget } from './parts/routes';
import { Say } from './parts/Say';
import { StatePanel } from './parts/StatePanel';
import { useLoaded } from './parts/useLoaded';

function articleId(value: string | string[] | undefined): string {
  const parts = Array.isArray(value) ? value : value === undefined ? [] : value.split('/');
  return parts.map(decodeURIComponent).join('/');
}

export default function ArticleScreen() {
  const service = useService(createStudyService);
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const openTarget = useOpenTarget();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const id = articleId(params.id);
  const words = service.words();
  const load = useCallback(() => service.article(id), [service, id]);
  const { value, reload } = useLoaded(load);
  const language = service.language() ?? '';
  const [failure, setFailure] = useState<FailureCode | undefined>(undefined);

  if (value === undefined) {
    return <ScreenFrame loading={words.t('common.busy')} />;
  }

  if (value.state !== 'article') {
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

  const { article, related, saved } = value;
  const kind = words.t(article.kind === 'word' ? 'article.word' : 'article.academy');

  return (
    <ScreenFrame>
      <TopBar
        backLabel={words.t('common.back')}
        centered
        trailing={
          <GlassIconButton
            label={words.t(saved === undefined ? 'article.save' : 'common.bookmark.remove')}
            size={theme.space.sp14}
            onPress={async () => {
              const outcome =
                saved === undefined
                  ? await service.save({ target: 'article', article: article.id, language })
                  : await service.unsave(saved.id);
              setFailure(outcome === undefined || outcome.ok ? undefined : outcome.code);
              await reload();
            }}
          >
            <Icon name="bookmark" color={saved === undefined ? undefined : theme.color.accentBlue} />
          </GlassIconButton>
        }
      >
        <Say role="label" tone="title" weight="semibold" style={styles.center}>
          {article.title}
        </Say>
        <Say role="caption" tone="dim" style={styles.center}>
          {words.t('article.meta', { kind, language: service.languageName() ?? language })}
        </Say>
      </TopBar>
      {failure === undefined ? null : (
        <View style={{ paddingHorizontal: theme.space.gutterScreen, paddingTop: theme.space.sp4 }}>
          <Notice text={words.t(`failure.${failure}`)} />
        </View>
      )}
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: theme.space.gutterScreen,
          paddingTop: theme.space.sp9,
          paddingBottom: insets.bottom + theme.space.sp13,
        }}
      >
        <GlassSurface
          level={2}
          blur="strong"
          radius="xl"
          style={{ padding: theme.space.gutterCard, gap: theme.space.sp6 }}
        >
          {article.subtitle === undefined ? null : (
            <Say role="caption" tone="dim" selectable>
              {article.subtitle}
            </Say>
          )}
          <View style={{ direction: directionOf(article.title), gap: theme.space.sp6 }}>
            <Blocks
              blocks={article.blocks}
              language={article.provenance.language}
              onLink={openTarget}
              linkMissing={words.t('article.linkMissing')}
            />
          </View>
          {related.length === 0 ? null : (
            <View style={{ gap: theme.space.sp5, marginTop: theme.space.sp4 }}>
              <Say role="overline" tone="dim">
                {words.t('article.links')}
              </Say>
              <View style={[styles.wrap, { gap: theme.space.sp3 }]}>
                {related.map((item) => (
                  <GlassButton
                    key={item.id}
                    variant="quiet"
                    size="sm"
                    onPress={() => router.push(articleHref(item.id))}
                  >
                    {item.title}
                  </GlassButton>
                ))}
              </View>
            </View>
          )}
        </GlassSurface>
        <Attribution words={words} provenance={article.provenance} />
      </ScrollView>
    </ScreenFrame>
  );
}

const styles = StyleSheet.create({
  center: { textAlign: 'center' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap' },
});
