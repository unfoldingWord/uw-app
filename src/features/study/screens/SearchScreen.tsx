import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { SectionList, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GlassInput, Icon, type IconName } from '@shared/glass';
import { useService } from '@shared/kernel';
import { useTheme } from '@shared/theme';
import { useKeyboardInset } from '@shared/ui';
import {
  createStudyService,
  type FullTextHit,
  type FullTextIndexView,
  type LinkTarget,
  type SearchView,
  type TitleHit,
} from '../service';
import { ScreenFrame, TopBar } from './parts/Frame';
import { FullTextRow } from './parts/FullTextRow';
import { ResultRow } from './parts/ResultRow';
import { passageHref, studyRoutes, useOpenTarget } from './parts/routes';
import { Say } from './parts/Say';
import { StatePanel } from './parts/StatePanel';

type Found = { query: string; view: SearchView; inText: readonly FullTextHit[] };

type ResultItem = {
  readonly key: string;
  readonly icon: IconName;
  readonly title: string;
  readonly detail: string;
  readonly target: LinkTarget | { readonly passage: string };
};

type ResultSection = { readonly key: string; readonly title: string; readonly data: readonly ResultItem[] };

const kindIcons: Record<TitleHit['kind'], IconName> = { word: 'search', academy: 'compass', story: 'grid' };

function targetIcon(target: LinkTarget): IconName {
  return target.kind === 'article' ? 'search' : target.kind === 'story' ? 'grid' : 'layers';
}

function targetKey(target: LinkTarget): string {
  return target.kind === 'article'
    ? target.id
    : target.kind === 'story'
      ? String(target.story)
      : target.reference;
}

export default function SearchScreen() {
  const service = useService(createStudyService);
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const openTarget = useOpenTarget();
  const keyboard = useKeyboardInset(theme.space.sp8);
  const words = service.words();
  const [query, setQuery] = useState('');
  const [found, setFound] = useState<Found | undefined>(undefined);
  const [searching, setSearching] = useState(false);
  const [index, setIndex] = useState<FullTextIndexView | undefined>(undefined);
  const generation = useRef(0);
  const indexRead = useRef(0);
  const latest = useRef(query);
  latest.current = query;
  const language = service.languageName();

  const run = useCallback(
    async (text: string) => {
      generation.current += 1;
      const mine = generation.current;
      setSearching(true);
      try {
        const view = await service.search(text.trim());
        const inText =
          view.state === 'results' && view.fullText && text.trim().length > 0
            ? await service.fullText(text.trim())
            : [];
        if (mine === generation.current) {
          setFound({ query: text, view, inText });
        }
      } finally {
        if (mine === generation.current) {
          setSearching(false);
        }
      }
    },
    [service],
  );

  const readIndex = useCallback(async () => {
    indexRead.current += 1;
    const mine = indexRead.current;
    const next = await service.fullTextIndex();
    if (mine === indexRead.current) {
      setIndex(next);
    }
  }, [service]);

  useEffect(() => {
    let built = service.indexState()?.state === 'built';
    void readIndex();
    return service.onFullText(() => {
      const now = service.indexState()?.state === 'built';
      if (now && !built && latest.current.trim().length > 0) {
        void run(latest.current);
      }
      built = now;
      void readIndex();
    });
  }, [service, readIndex, run]);

  const pause = theme.motion.duration.durBase;
  useEffect(() => {
    if (query.trim().length === 0) {
      generation.current += 1;
      setFound(undefined);
      setSearching(false);
      return undefined;
    }
    setSearching(true);
    const timer = setTimeout(() => void run(query), pause);
    return () => clearTimeout(timer);
  }, [run, query, pause]);

  const kindLabel = (kind: TitleHit['kind']) =>
    words.t(
      kind === 'word' ? 'search.kind.word' : kind === 'academy' ? 'search.kind.academy' : 'search.kind.story',
    );

  const view = found?.view;
  const trimmed = query.trim();
  const reference = view?.state === 'results' ? view.results.reference : undefined;
  const titles = view?.state === 'results' ? view.results.titles : [];
  const inText = found?.inText ?? [];
  const nothing =
    !searching && trimmed.length > 0 && reference === undefined && titles.length === 0 && inText.length === 0;

  const sections: ResultSection[] = [
    ...(reference === undefined
      ? []
      : [
          {
            key: 'passages',
            title: words.t('search.passages'),
            data: [
              {
                key: reference.reference,
                icon: 'layers' as const,
                title: service.referenceName(reference.reference),
                detail: reference.available
                  ? words.t('search.kind.passage', { language: language ?? '' })
                  : words.t('study.passage.missing', { language: language ?? '' }),
                target: { passage: reference.reference },
              },
            ],
          },
        ]),
    ...(titles.length === 0
      ? []
      : [
          {
            key: 'titles',
            title: words.t('search.titles'),
            data: titles.map((hit) => ({
              key: `${hit.kind}:${targetKey(hit.target)}`,
              icon: kindIcons[hit.kind],
              title: hit.title,
              detail: kindLabel(hit.kind),
              target: hit.target,
            })),
          },
        ]),
    ...(inText.length === 0
      ? []
      : [
          {
            key: 'inText',
            title: words.t('search.inText'),
            data: inText.map((hit, position) => ({
              key: `${targetKey(hit.target)}:${String(position)}`,
              icon: targetIcon(hit.target),
              title: service.label(hit.target) ?? hit.provenance.title,
              detail: hit.snippet,
              target: hit.target,
            })),
          },
        ]),
  ];

  const open = (item: ResultItem) => {
    if ('passage' in item.target) {
      router.navigate(passageHref(item.target.passage));
      return;
    }
    openTarget(item.target);
  };

  const caption =
    trimmed.length === 0
      ? words.t('search.empty')
      : searching
        ? words.t('search.searching')
        : nothing
          ? words.t('search.noResults', { query: trimmed })
          : undefined;

  return (
    <ScreenFrame>
      <TopBar backLabel={words.t('common.back')}>
        <GlassInput
          accessibilityLabel={words.t('search.label')}
          placeholder={words.t('search.placeholder')}
          value={query}
          onChangeText={setQuery}
          autoFocus
          autoCorrect={false}
          returnKeyType="search"
          leading={<Icon name="search" size={theme.fontSize.fsSubtitle} />}
          height={theme.space.sp14}
        />
      </TopBar>
      {language === undefined || view?.state === 'no-language' ? (
        <StatePanel
          message={words.t('study.noLanguage')}
          action={{
            label: words.t('study.noLanguage.action'),
            onPress: () => router.push(studyRoutes.languages),
          }}
        />
      ) : (
        <View ref={keyboard.frame} style={styles.fill} onLayout={keyboard.onLayout}>
          <SectionList
            sections={sections}
            keyExtractor={(item) => item.key}
            stickySectionHeadersEnabled={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            contentContainerStyle={{
              gap: theme.space.sp3,
              paddingHorizontal: theme.space.gutterScreen,
              paddingTop: theme.space.sp8,
              paddingBottom: Math.max(insets.bottom, keyboard.overlap) + theme.space.sp13,
            }}
            ListHeaderComponent={
              caption === undefined ? null : (
                <Say role="caption" tone="body" live>
                  {caption}
                </Say>
              )
            }
            renderSectionHeader={({ section }) => (
              <View style={{ paddingTop: section.key === 'passages' ? 0 : theme.space.sp4 }}>
                <Say role="overline" tone="dim">
                  {section.title}
                </Say>
              </View>
            )}
            renderItem={({ item }) => (
              <ResultRow
                icon={item.icon}
                title={item.title}
                detail={item.detail}
                onPress={() => open(item)}
              />
            )}
            ListFooterComponent={
              <View style={{ marginTop: theme.space.sp6 }}>
                <FullTextRow
                  index={index}
                  words={words}
                  onToggle={async (on) => {
                    await service.setFullText(on);
                    await readIndex();
                  }}
                  onRetry={async () => {
                    await service.retryFullText();
                    await readIndex();
                  }}
                />
              </View>
            }
          />
        </View>
      )}
    </ScreenFrame>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
});
