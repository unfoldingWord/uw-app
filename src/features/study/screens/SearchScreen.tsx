import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GlassInput, Icon, type IconName } from '@shared/glass';
import { useService } from '@shared/kernel';
import { useTheme } from '@shared/theme';
import {
  createStudyService,
  type FullTextHit,
  type LinkTarget,
  type SearchView,
  type TitleHit,
} from '../service';
import { ScreenFrame, TopBar } from './parts/Frame';
import { ResultRow } from './parts/ResultRow';
import { passageHref, studyRoutes, useOpenTarget } from './parts/routes';
import { Say } from './parts/Say';
import { StatePanel } from './parts/StatePanel';

type Found = { query: string; view: SearchView; inText: readonly FullTextHit[] };

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
  const words = service.words();
  const [query, setQuery] = useState('');
  const [found, setFound] = useState<Found | undefined>(undefined);
  const generation = useRef(0);
  const language = service.languageName();

  const run = useCallback(
    async (text: string) => {
      generation.current += 1;
      const mine = generation.current;
      const view = await service.search(text.trim());
      const inText =
        view.state === 'results' && view.fullText && text.trim().length > 0
          ? await service.fullText(text.trim())
          : [];
      if (mine === generation.current) {
        setFound({ query: text, view, inText });
      }
    },
    [service],
  );

  const pause = theme.motion.duration.durBase;
  useEffect(() => {
    if (query.trim().length === 0) {
      generation.current += 1;
      setFound(undefined);
      return undefined;
    }
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
  const nothing = trimmed.length > 0 && reference === undefined && titles.length === 0 && inText.length === 0;

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
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            gap: theme.space.sp3,
            paddingHorizontal: theme.space.gutterScreen,
            paddingTop: theme.space.sp8,
            paddingBottom: insets.bottom + theme.space.sp13,
          }}
        >
          {trimmed.length === 0 ? (
            <Say role="caption" tone="body">
              {words.t('search.empty')}
            </Say>
          ) : null}
          {nothing ? (
            <Say role="caption" tone="body" live>
              {words.t('search.noResults', { query: trimmed })}
            </Say>
          ) : null}
          {reference === undefined ? null : (
            <View style={{ gap: theme.space.sp3 }}>
              <Say role="overline" tone="dim">
                {words.t('search.passages')}
              </Say>
              <ResultRow
                icon="layers"
                title={service.referenceName(reference.reference)}
                detail={
                  reference.available
                    ? words.t('search.kind.passage', { language: language ?? '' })
                    : words.t('study.passage.missing', { language: language ?? '' })
                }
                onPress={() => router.navigate(passageHref(reference.reference))}
              />
            </View>
          )}
          {titles.length === 0 ? null : (
            <View style={{ gap: theme.space.sp3, marginTop: theme.space.sp4 }}>
              <Say role="overline" tone="dim">
                {words.t('search.titles')}
              </Say>
              {titles.map((hit) => (
                <ResultRow
                  key={`${hit.kind}:${targetKey(hit.target)}`}
                  icon={kindIcons[hit.kind]}
                  title={hit.title}
                  detail={kindLabel(hit.kind)}
                  onPress={() => openTarget(hit.target)}
                />
              ))}
            </View>
          )}
          {inText.length === 0 ? null : (
            <View style={{ gap: theme.space.sp3, marginTop: theme.space.sp4 }}>
              <Say role="overline" tone="dim">
                {words.t('search.inText')}
              </Say>
              {inText.map((hit, index) => (
                <ResultRow
                  key={`${targetKey(hit.target)}:${String(index)}`}
                  icon={targetIcon(hit.target)}
                  title={service.label(hit.target) ?? hit.provenance.title}
                  detail={hit.snippet}
                  onPress={() => openTarget(hit.target)}
                />
              ))}
            </View>
          )}
          {view?.state === 'results' && !view.fullText ? (
            <View style={{ marginTop: theme.space.sp6 }}>
              <ResultRow
                quiet
                icon="settings"
                title={words.t('search.fullText.title')}
                detail={words.t('search.fullText.inSettings')}
                onPress={() => router.push(studyRoutes.settings)}
              />
            </View>
          ) : null}
        </ScrollView>
      )}
    </ScreenFrame>
  );
}
