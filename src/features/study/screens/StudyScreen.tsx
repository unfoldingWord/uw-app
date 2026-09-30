import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import type { PackId } from '@lib/domain/pack';
import { useService } from '@shared/kernel';
import { useTheme } from '@shared/theme';
import { useTabBarClearance } from '@shared/ui';
import { createStudyService, type StudyView } from '../service';
import { Attribution } from './parts/Attribution';
import { AudioBar } from './parts/AudioBar';
import { BookPicker } from './parts/BookPicker';
import { Choices, type Choice } from './parts/Choices';
import { failureText } from './parts/failure';
import { ScreenFrame } from './parts/Frame';
import { HelpsPanel, type HelpsTab } from './parts/HelpsPanel';
import {
  chapterOf,
  helpsAt,
  highlightedIn,
  keyOf,
  neighbours,
  verseOf,
  type ChapterPlace,
  type VerseKey,
} from './parts/passage';
import { shareHref, studyRoutes, useOpenTarget } from './parts/routes';
import { StatePanel } from './parts/StatePanel';
import { StudyHeader } from './parts/StudyHeader';
import { useLoaded } from './parts/useLoaded';
import { VerseList } from './parts/VerseList';

type ReadingKey = 'literal' | 'simplified' | 'original';

function asText(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function placeReference(place: ChapterPlace): string {
  return `${place.book} ${String(place.chapter)}`;
}

export default function StudyScreen() {
  const service = useService(createStudyService);
  const theme = useTheme();
  const tabBarClearance = useTabBarClearance();
  const router = useRouter();
  const openTarget = useOpenTarget();
  const params = useLocalSearchParams<{ reference?: string }>();
  const requested = asText(params.reference);
  const [chosen, setChosen] = useState<{ reference: string; verse: VerseKey | undefined } | undefined>(
    undefined,
  );
  const [original, setOriginal] = useState(false);
  const [picking, setPicking] = useState(false);
  const [tab, setTab] = useState<HelpsTab>('notes');
  const [focused, setFocused] = useState<string | undefined>(undefined);
  const [failure, setFailure] = useState<string | undefined>(undefined);
  const [audioFailure, setAudioFailure] = useState<string | undefined>(undefined);
  const [seen, setSeen] = useState(requested);
  if (seen !== requested) {
    setSeen(requested);
    setChosen(undefined);
  }
  const words = service.words();

  const target = chosen?.reference ?? requested;
  const openedReference = useCallback(async () => {
    const view = await service.open();
    return view.state === 'passage' ? view.view.reference : undefined;
  }, [service]);
  const load = useCallback(async () => {
    const opened = target ?? (await openedReference());
    const place = opened === undefined ? undefined : chapterOf(opened);
    const view: StudyView =
      place === undefined ? await service.open() : await service.passage(placeReference(place));
    const landing = opened === undefined ? undefined : verseOf(opened);
    const books = await service.books();
    const originalPassage =
      original && view.state === 'passage' && service.originalOf(view.view.passage.text.book) !== undefined
        ? await service.original(view.view.reference)
        : undefined;
    return { view, books, originalPassage, landing };
  }, [service, target, original, openedReference]);
  const { value, reload } = useLoaded(load);

  const selectedVerse = useMemo(() => {
    if (value?.view.state !== 'passage') {
      return undefined;
    }
    const wanted = chosen?.verse ?? value.landing;
    const verses = value.view.view.passage.text.verses;
    const found = verses.find(
      (verse) => wanted !== undefined && verse.chapter === wanted.chapter && verse.verse === wanted.verse,
    );
    const first = found ?? verses[0];
    return first === undefined ? undefined : keyOf(first);
  }, [value, chosen]);

  const go = (reference: string, verse?: VerseKey) => {
    setChosen({ reference, verse });
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
          />
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
        <BookPicker
          words={words}
          open={picking}
          books={books}
          current={undefined}
          onClose={() => setPicking(false)}
          onChoose={(book, chapter) => {
            setPicking(false);
            go(`${book} ${String(chapter)}`);
          }}
        />
      </ScreenFrame>
    );
  }

  const passageView = view.view;
  const passage = passageView.passage;
  const shown = value.originalPassage ?? passage;
  const place = chapterOf(passageView.reference);
  const around = neighbours(books, place);
  const originalChoice = service.originalOf(passage.text.book);
  const showingOriginal = value.originalPassage !== undefined;
  const readingChoices: Choice<ReadingKey>[] = [
    ...passageView.choices.map((choice) => ({
      key: choice.text,
      label: choice.label,
      selected: choice.selected && !showingOriginal,
    })),
    ...(originalChoice === undefined
      ? []
      : [{ key: 'original' as const, label: originalChoice.label, selected: showingOriginal }]),
  ];
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
  const saved = passageView.saved;

  return (
    <ScreenFrame>
      <StudyHeader
        words={words}
        language={language}
        place={words.t('study.nav.reference', {
          book: passage.text.bookName,
          chapter: String(place?.chapter ?? ''),
        })}
        previous={around.previous}
        next={around.next}
        onGo={(next) => go(placeReference(next))}
        onChoose={() => setPicking(true)}
      />
      {readingChoices.length < 2 ? null : (
        <Choices
          label={words.t('study.text.choice')}
          choices={readingChoices}
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
          verseLabel={(verse) =>
            words.t('common.joined', {
              first: words.t('study.nav.verse', { verse: String(verse.verse) }),
              second: verse.text,
            })
          }
          onSelect={(verse) => {
            setChosen({ reference: passageView.reference, verse });
            setFocused(undefined);
          }}
          footer={<Attribution words={words} provenance={shown.text.provenance} />}
        />
      </View>
      <HelpsPanel
        words={words}
        passage={passage}
        at={selectedVerse}
        tab={tab}
        onTab={setTab}
        focused={focused}
        onFocus={setFocused}
        onLink={openTarget}
        labelOf={service.label}
        saved={saved !== undefined}
        onToggleSave={async () => {
          if (saved === undefined) {
            await service.save({
              target: 'passage',
              reference: passageView.reference,
              language: passageView.language,
            });
          } else {
            await service.unsave(saved.id);
          }
          await reload();
        }}
        onShare={() => router.push(shareHref('passage', passageView.reference, passageView.language))}
      />
      <AudioBar
        words={words}
        reference={words.t('study.nav.reference', {
          book: passage.text.bookName,
          chapter: String(place?.chapter ?? ''),
        })}
        audio={passageView.audio}
        onDownload={(pack) => download(pack, setAudioFailure)}
        failure={audioFailure}
      />
      <View style={{ height: tabBarClearance }} />
      <BookPicker
        words={words}
        open={picking}
        books={books}
        current={place}
        onClose={() => setPicking(false)}
        onChoose={(book, chapter) => {
          setPicking(false);
          go(`${book} ${String(chapter)}`);
        }}
      />
    </ScreenFrame>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
});
