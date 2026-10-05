import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import type { PackId } from '@lib/domain/pack';
import { formatReference } from '@lib/domain/reference';
import { GlassButton } from '@shared/glass';
import { useService } from '@shared/kernel';
import { useTheme } from '@shared/theme';
import { Notice, useTabBarClearance } from '@shared/ui';
import { createStudyService, type Passage, type StudyView } from '../service';
import type { StudyWords } from '../strings';
import { Attribution } from './parts/Attribution';
import { AudioBar } from './parts/AudioBar';
import { BookPicker } from './parts/BookPicker';
import { Choices } from './parts/Choices';
import { failureText } from './parts/failure';
import { ScreenFrame } from './parts/Frame';
import { HelpsPanel, helpsShare, type HelpsTab } from './parts/HelpsPanel';
import {
  chapterOf,
  helpsAt,
  highlightedIn,
  keyOf,
  neighbours,
  type ChapterPlace,
  type VerseKey,
} from './parts/passage';
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
  const params = useLocalSearchParams<{ reference?: string }>();
  const requested = asText(params.reference);
  const [chosen, setChosen] = useState<string | undefined>(undefined);
  const [selected, setSelected] = useState<VerseKey | undefined>(undefined);
  const [original, setOriginal] = useState(false);
  const [picking, setPicking] = useState(false);
  const [tab, setTab] = useState<HelpsTab>('notes');
  const [focused, setFocused] = useState<string | undefined>(undefined);
  const [failure, setFailure] = useState<string | undefined>(undefined);
  const [audioFailure, setAudioFailure] = useState<string | undefined>(undefined);
  const [saveFailure, setSaveFailure] = useState<string | undefined>(undefined);
  const [seen, setSeen] = useState(requested);
  if (seen !== requested) {
    setSeen(requested);
    setChosen(undefined);
    setSelected(undefined);
  }
  const words = service.words();

  const target = chosen ?? requested;
  const load = useCallback(async () => {
    const view: StudyView =
      target === undefined ? await service.open({ original }) : await service.passage(target, { original });
    const books = await service.books(view.state === 'original' ? view.passage.language : undefined);
    return { view, books };
  }, [service, target, original]);
  const { value, reload } = useLoaded(load);

  const chosenVerse = selected ?? (value?.view.state === 'passage' ? value.view.view.landing : undefined);
  const selectedVerse = useMemo(() => {
    if (value?.view.state !== 'passage') {
      return undefined;
    }
    const verses = value.view.view.passage.text.verses;
    const found = verses.find(
      (verse) =>
        chosenVerse !== undefined &&
        verse.chapter === chosenVerse.chapter &&
        verse.verse === chosenVerse.verse,
    );
    const first = found ?? verses[0];
    return first === undefined ? undefined : keyOf(first);
  }, [value, chosenVerse]);

  const go = (reference: string) => {
    setChosen(reference);
    setSelected(undefined);
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
    chosenVerse === undefined ? passageView.reference : verseReference(passage.text.book, chosenVerse);
  const saved = service.saved({
    target: 'passage',
    reference: focusReference,
    language: passageView.language,
  });
  const helps = selectedVerse === undefined ? undefined : helpsAt(passage, selectedVerse);
  const focusedSpans =
    helps?.notes.find((note) => note.id === focused)?.words ??
    helps?.wordLinks.find((link) => link.id === focused)?.words ??
    helps?.notes[0]?.words ??
    [];
  const highlighted =
    showingOriginal || selectedVerse === undefined
      ? new Set<number>()
      : highlightedIn(focusedSpans, selectedVerse);

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
            await reload();
          }}
          style={{ marginHorizontal: theme.space.gutterScreen, marginTop: theme.space.sp6 }}
        />
      )}
      <View style={styles.fill}>
        <VerseList
          passage={shown}
          language={shown.language}
          selected={selectedVerse}
          highlighted={highlighted}
          verseLabel={verseLabelOf(words)}
          onSelect={(verse) => {
            setSelected(verse);
            setFocused(undefined);
            void service.opened(verseReference(passage.text.book, verse));
          }}
          footer={<Attribution words={words} provenance={shown.text.provenance} />}
        />
      </View>
      {saveFailure === undefined ? null : (
        <View style={{ paddingHorizontal: theme.space.gutterScreen, paddingVertical: theme.space.sp4 }}>
          <Notice text={saveFailure} />
        </View>
      )}
      <HelpsPanel
        words={words}
        passage={passage}
        installed={passageView.helps}
        at={selectedVerse}
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
          setSaveFailure(outcome === undefined || outcome.ok ? undefined : failureText(words, outcome.code));
          await reload();
        }}
        onShare={() => router.push(shareHref('passage', focusReference, passageView.language))}
      />
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
  fill: { flexGrow: 1, flexShrink: 1, flexBasis: helpsShare },
});
