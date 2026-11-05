import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import type { PackId } from '@lib/domain/pack';
import { formatReference } from '@lib/domain/reference';
import { GlassButton, GlassSheet, sheetHeights } from '@shared/glass';
import { useService } from '@shared/kernel';
import { useTheme } from '@shared/theme';
import { Notice, useTabBarClearance } from '@shared/ui';
import { createStudyService, type CopyReference, type Passage, type StudyView } from '../service';
import type { StudyWords } from '../strings';
import { Attribution } from './parts/Attribution';
import { AudioBar } from './parts/AudioBar';
import { BookPicker } from './parts/BookPicker';
import { Choices } from './parts/Choices';
import { CopyPanel, type CopyState } from './parts/CopyPanel';
import { failureText } from './parts/failure';
import { ScreenFrame } from './parts/Frame';
import { HelpsPanel, helpsHeading, helpsPeekShare, type HelpsTab } from './parts/HelpsPanel';
import {
  chapterOf,
  focusedSpans,
  helpsAt,
  highlightedIn,
  keyOf,
  neighbours,
  orderedSpan,
  requestedVerse,
  sameVerse,
  type ChapterPlace,
  type VerseKey,
} from './parts/passage';
import { requestKey } from './parts/opening';
import { shareHref, studyRoutes, useOpenTarget } from './parts/routes';
import { StatePanel } from './parts/StatePanel';
import { StudyHeader } from './parts/StudyHeader';
import { useLoaded } from './parts/useLoaded';
import { VerseList } from './parts/VerseList';

function asText(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function placeReference(place: ChapterPlace): string {
  return formatReference({ book: place.book, start: { chapter: place.chapter } });
}

function verseReference(book: string, verse: VerseKey): string {
  return formatReference({ book, start: verse });
}

function spanReference(book: string, from: VerseKey, to: VerseKey | undefined): string {
  const span = orderedSpan(from, to);
  return sameVerse(span.from, span.to)
    ? verseReference(book, span.from)
    : formatReference({ book, start: span.from, end: span.to });
}

const idle: CopyState = { state: 'idle' };

function verseLabelOf(words: StudyWords) {
  return (verse: { verse: number; text: string }) =>
    words.t('common.joined', {
      first: words.t('study.nav.verse', { verse: String(verse.verse) }),
      second: verse.text,
    });
}

function placeLabel(words: StudyWords, passage: Passage, place: ChapterPlace | undefined): string {
  return words.t('study.nav.reference', {
    book: passage.text.bookName,
    chapter: String(place?.chapter ?? ''),
  });
}

export default function StudyScreen() {
  const service = useService(createStudyService);
  const theme = useTheme();
  const tabBarClearance = useTabBarClearance();
  const router = useRouter();
  const openTarget = useOpenTarget();
  const params = useLocalSearchParams<{ reference?: string; opening?: string }>();
  const requested = asText(params.reference);
  const opening = requestKey(requested, asText(params.opening));
  const [chosen, setChosen] = useState<string | undefined>(undefined);
  const [selected, setSelected] = useState<VerseKey | undefined>(() => requestedVerse(requested));
  const [through, setThrough] = useState<VerseKey | undefined>(undefined);
  const [copy, setCopy] = useState<CopyState>(idle);
  const [original, setOriginal] = useState(false);
  const [readingChanges, setReadingChanges] = useState(0);
  const [picking, setPicking] = useState(false);
  const [tab, setTab] = useState<HelpsTab>('notes');
  const [focused, setFocused] = useState<string | undefined>(undefined);
  const [failure, setFailure] = useState<string | undefined>(undefined);
  const [audioFailure, setAudioFailure] = useState<string | undefined>(undefined);
  const [saveFailure, setSaveFailure] = useState<string | undefined>(undefined);
  const [room, setRoom] = useState(0);
  const [seen, setSeen] = useState(opening);
  if (seen !== opening) {
    setSeen(opening);
    setChosen(undefined);
    setSelected(requestedVerse(requested));
    setThrough(undefined);
    setCopy(idle);
    setFocused(undefined);
  }
  const words = service.words();

  const target = chosen ?? requested;
  const request = JSON.stringify([target ?? null, original, readingChanges]);
  const load = useCallback(async () => {
    const view: StudyView =
      target === undefined ? await service.open({ original }) : await service.passage(target, { original });
    const books = await service.books(view.state === 'original' ? view.passage.language : undefined);
    return { view, books, request };
  }, [service, target, original, request]);
  const { value, reload } = useLoaded(load, service.onPacksChange);
  const changing = value !== undefined && value.request !== request;

  const selectedVerse = useMemo(() => {
    if (value?.view.state !== 'passage' || selected === undefined) {
      return undefined;
    }
    const found = value.view.view.passage.text.verses.find((verse) => sameVerse(selected, keyOf(verse)));
    return found === undefined ? undefined : keyOf(found);
  }, [value, selected]);

  const throughVerse = useMemo(() => {
    if (value?.view.state !== 'passage' || through === undefined) {
      return undefined;
    }
    const found = value.view.view.passage.text.verses.find((verse) => sameVerse(through, keyOf(verse)));
    return found === undefined ? undefined : keyOf(found);
  }, [value, through]);

  const [helpsVerse, setHelpsVerse] = useState<VerseKey | undefined>(undefined);
  if (selectedVerse !== undefined && !sameVerse(helpsVerse, selectedVerse)) {
    setHelpsVerse(selectedVerse);
  }

  const dismissHelps = useCallback(() => {
    setSelected(undefined);
    setThrough(undefined);
    setCopy(idle);
    setFocused(undefined);
  }, []);

  const go = (reference: string) => {
    setChosen(reference);
    setSelected(undefined);
    setThrough(undefined);
    setCopy(idle);
    setFocused(undefined);
  };

  const download = async (pack: PackId, onFailure: (text: string | undefined) => void) => {
    onFailure(undefined);
    const outcome = await service.download(pack);
    if (!outcome.ok) {
      onFailure(failureText(words, outcome.code));
    }
    await reload();
  };

  if (value === undefined) {
    return <ScreenFrame loading={words.t('common.busy')} />;
  }

  const { view, books } = value;
  const language = service.languageName();
  const picker = (current: ChapterPlace | undefined) => (
    <BookPicker
      words={words}
      open={picking}
      books={books}
      current={current}
      onClose={() => setPicking(false)}
      onChoose={(book, chapter) => {
        setPicking(false);
        setOriginal(false);
        go(placeReference({ book, chapter }));
      }}
    />
  );

  if (view.state === 'original') {
    const place = chapterOf(view.reference);
    const around = neighbours(books, place);
    return (
      <ScreenFrame>
        <StudyHeader
          words={words}
          language={language}
          place={placeLabel(words, view.passage, place)}
          previous={around.previous}
          next={around.next}
          onGo={(next) => go(placeReference(next))}
          onChoose={() => setPicking(true)}
          busy={changing}
        />
        <Choices
          label={words.t('study.text.choice')}
          choices={[
            { key: 'back', label: language ?? words.t('common.back'), selected: false },
            { key: 'original', label: view.choice.label, selected: true },
          ]}
          onChoose={(key) => {
            if (key === 'back') {
              setOriginal(false);
              setChosen(undefined);
            }
          }}
          style={{ marginHorizontal: theme.space.gutterScreen, marginTop: theme.space.sp6 }}
        />
        <View style={styles.fill}>
          <VerseList
            passage={view.passage}
            language={view.passage.language}
            selected={undefined}
            highlighted={new Set<number>()}
            verseLabel={verseLabelOf(words)}
            onSelect={() => undefined}
            footer={<Attribution words={words} provenance={view.passage.text.provenance} />}
          />
        </View>
        <View style={{ height: tabBarClearance }} />
        {picker(place)}
      </ScreenFrame>
    );
  }

  if (view.state !== 'passage') {
    return (
      <ScreenFrame>
        <StudyHeader
          words={words}
          language={language}
          place={undefined}
          previous={undefined}
          next={undefined}
          onGo={(place) => go(placeReference(place))}
          onChoose={() => setPicking(true)}
        />
        {view.state === 'no-language' ? (
          <StatePanel
            message={words.t('study.noLanguage')}
            action={{
              label: words.t('study.noLanguage.action'),
              onPress: () => router.push(studyRoutes.languages),
            }}
          />
        ) : view.state === 'not-downloaded' ? (
          <StatePanel
            message={words.t('study.passage.notDownloaded', { language: language ?? view.language })}
            action={{
              label: words.t('state.notDownloaded.action', { language: language ?? view.language }),
              onPress: () => download(view.pack, setFailure),
            }}
            failure={failure}
          />
        ) : view.state === 'no-text' ? (
          <StatePanel
            message={words.t('state.nothingPublished', { language: language ?? view.language })}
            action={{ label: words.t('library.open'), onPress: () => router.push(studyRoutes.library) }}
          >
            {view.originals.map((opening) => (
              <GlassButton
                key={opening.language}
                variant="glass"
                full
                onPress={() => {
                  setOriginal(true);
                  go(opening.reference);
                }}
              >
                {words.t('study.original.read', { text: opening.label })}
              </GlassButton>
            ))}
          </StatePanel>
        ) : (
          <StatePanel
            message={words.t('study.passage.missing', { language: language ?? view.language })}
            action={
              books.length === 0
                ? undefined
                : { label: words.t('study.nav.choose'), onPress: () => setPicking(true) }
            }
          />
        )}
        {picker(undefined)}
      </ScreenFrame>
    );
  }

  const passageView = view.view;
  const passage = passageView.passage;
  const shown = passageView.original ?? passage;
  const showingOriginal = passageView.original !== undefined;
  const place = chapterOf(passageView.reference);
  const around = neighbours(books, place);
  const focusReference =
    selectedVerse === undefined ? passageView.reference : verseReference(passage.text.book, selectedVerse);
  const saved = service.saved({
    target: 'passage',
    reference: focusReference,
    language: passageView.language,
  });
  const copyReference =
    selectedVerse === undefined
      ? passageView.reference
      : spanReference(passage.text.book, selectedVerse, throughVerse);
  const copySelection = async (format?: CopyReference) => {
    if (selectedVerse === undefined) {
      return;
    }
    if (format !== undefined) {
      await service.setCopyReference(format);
    }
    const outcome = await service.copy(shown, { from: selectedVerse, to: throughVerse ?? selectedVerse });
    setCopy(
      outcome.ok
        ? { state: 'copied', label: outcome.label }
        : { state: 'failed', text: failureText(words, outcome.code) },
    );
  };
  const choose = (verse: VerseKey) => {
    setSelected(verse);
    setThrough(undefined);
    setCopy(idle);
    setFocused(undefined);
    void service.opened(verseReference(passage.text.book, verse));
  };
  const highlighted =
    showingOriginal || selectedVerse === undefined
      ? new Set<number>()
      : highlightedIn(focusedSpans(helpsAt(passage, selectedVerse), focused), selectedVerse);

  return (
    <ScreenFrame>
      <StudyHeader
        words={words}
        language={language}
        place={placeLabel(words, passage, place)}
        previous={around.previous}
        next={around.next}
        onGo={(next) => go(placeReference(next))}
        onChoose={() => setPicking(true)}
        busy={changing}
      />
      {passageView.choices.length === 0 ? null : (
        <Choices
          label={words.t('study.text.choice')}
          choices={passageView.choices.map((choice) => ({
            key: choice.text,
            label: choice.label,
            selected: choice.selected,
          }))}
          onChoose={async (key) => {
            if (key === 'original') {
              setOriginal(true);
              return;
            }
            setOriginal(false);
            await service.setReading(key);
            setReadingChanges((current) => current + 1);
          }}
          style={{ marginHorizontal: theme.space.gutterScreen, marginTop: theme.space.sp6 }}
        />
      )}
      <View
        style={styles.fill}
        accessibilityState={{ busy: changing }}
        onLayout={(event: LayoutChangeEvent) => setRoom(event.nativeEvent.layout.height)}
      >
        <View style={styles.fill}>
          <VerseList
            passage={shown}
            language={shown.language}
            selected={selectedVerse}
            through={throughVerse}
            landing={passageView.landing}
            highlighted={highlighted}
            verseLabel={verseLabelOf(words)}
            onSelect={choose}
            onExtend={(verse) => {
              if (selectedVerse === undefined) {
                choose(verse);
                return;
              }
              setThrough(sameVerse(selectedVerse, verse) ? undefined : verse);
              setCopy(idle);
            }}
            footer={<Attribution words={words} provenance={shown.text.provenance} />}
          />
        </View>
        <GlassSheet
          open={selectedVerse !== undefined}
          heights={sheetHeights(room, helpsPeekShare)}
          accessibilityLabel={helpsVerse === undefined ? '' : helpsHeading(words, tab, helpsVerse)}
          closeLabel={words.t('common.close')}
          expandLabel={words.t('study.helps.expand')}
          collapseLabel={words.t('study.helps.collapse')}
          onDismiss={dismissHelps}
        >
          {saveFailure === undefined ? null : <Notice text={saveFailure} />}
          {helpsVerse === undefined ? null : (
            <HelpsPanel
              words={words}
              passage={passage}
              installed={passageView.helps}
              at={helpsVerse}
              tab={tab}
              onTab={setTab}
              focused={focused}
              onFocus={setFocused}
              onLink={openTarget}
              labelOf={service.label}
              saved={saved !== undefined}
              onToggleSave={async () => {
                const outcome =
                  saved === undefined
                    ? await service.save({
                        target: 'passage',
                        reference: focusReference,
                        language: passageView.language,
                      })
                    : await service.unsave(saved.id);
                setSaveFailure(
                  outcome === undefined || outcome.ok ? undefined : failureText(words, outcome.code),
                );
                await reload();
              }}
              onShare={() => router.push(shareHref('passage', focusReference, passageView.language))}
              copyLabel={words.t('study.copy.label', { reference: service.referenceName(copyReference) })}
              onCopy={() => copySelection()}
              copyPanel={
                <CopyPanel
                  words={words}
                  copy={copy}
                  ranged={throughVerse !== undefined}
                  formats={service.copyReferences()}
                  onFormat={(format) => void copySelection(format)}
                />
              }
            />
          )}
        </GlassSheet>
      </View>
      <AudioBar
        words={words}
        reference={placeLabel(words, passage, place)}
        audio={passageView.audio}
        onDownload={(pack) => download(pack, setAudioFailure)}
        failure={audioFailure}
      />
      <View style={{ height: tabBarClearance }} />
      {picker(place)}
    </ScreenFrame>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
});
