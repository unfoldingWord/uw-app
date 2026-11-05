import { useEffect, useState } from 'react';
import { Modal, Pressable, SectionList, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GlassButton, GlassIconButton, GlassSurface, Icon } from '@shared/glass';
import { useTheme } from '@shared/theme';
import { Gap } from '@shared/ui';
import type { BookEntry } from '../../service';
import type { StudyWords } from '../../strings';
import { Say } from './Say';

const bookColumns = 2;

const chapterColumns = 5;

type Pick = {
  readonly key: string;
  readonly label: string;
  readonly name?: string;
  readonly chosen: boolean;
  readonly choose: () => void;
};

type PickRow = { readonly key: string; readonly columns: number; readonly picks: readonly Pick[] };

type PickSection = { readonly key: string; readonly title: string; readonly data: readonly PickRow[] };

function rowsOf(picks: readonly Pick[], columns: number): PickRow[] {
  return Array.from({ length: Math.ceil(picks.length / columns) }, (_, index) => {
    const row = picks.slice(index * columns, (index + 1) * columns);
    return { key: row.map((pick) => pick.key).join(' '), columns, picks: row };
  });
}

export type BookPickerProps = {
  words: StudyWords;
  open: boolean;
  books: readonly BookEntry[];
  current: { book: string; chapter: number } | undefined;
  onClose: () => void;
  onChoose: (book: string, chapter: number) => void;
};

export function BookPicker({ words, open, books, current, onClose, onChoose }: BookPickerProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [book, setBook] = useState<string | undefined>(current?.book);
  useEffect(() => {
    if (open) {
      setBook(current?.book);
    }
  }, [open, current?.book]);
  const chosen = books.find((entry) => entry.code === book);
  const chooseBook = (entry: BookEntry) => {
    const [only] = entry.chapters;
    if (entry.chapters.length === 1 && only !== undefined) {
      onChoose(entry.code, only);
      return;
    }
    setBook(entry.code);
  };
  const testaments = (['old', 'new'] as const).map((testament): PickSection => ({
    key: testament,
    title: words.t(testament === 'old' ? 'study.nav.oldTestament' : 'study.nav.newTestament'),
    data: rowsOf(
      books
        .filter((entry) => entry.testament === testament)
        .map((entry) => ({
          key: entry.code,
          label: entry.name,
          chosen: entry.code === book,
          choose: () => chooseBook(entry),
        })),
      bookColumns,
    ),
  }));
  const chapters: PickSection[] =
    chosen === undefined || chosen.chapters.length < 2
      ? []
      : [
          {
            key: 'chapters',
            title: chosen.name,
            data: rowsOf(
              chosen.chapters.map((chapter) => ({
                key: String(chapter),
                label: String(chapter),
                name: words.t('study.nav.chapter', { chapter: String(chapter) }),
                chosen: current?.book === chosen.code && current.chapter === chapter,
                choose: () => onChoose(chosen.code, chapter),
              })),
              chapterColumns,
            ),
          },
        ];
  const sections = [...testaments, ...chapters].filter((section) => section.data.length > 0);
  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.scrim}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={words.t('common.close')}
          style={styles.fill}
          onPress={onClose}
        />
        <GlassSurface
          level={4}
          blur="heavy"
          radius="2xl"
          shadow="float"
          style={[
            styles.sheet,
            {
              marginHorizontal: theme.space.sp4,
              marginBottom: insets.bottom + theme.space.sp4,
              padding: theme.space.gutterCard,
              gap: theme.space.gapStack,
            },
          ]}
        >
          <View style={[styles.row, { gap: theme.space.sp5 }]}>
            <Say role="label" tone="title" weight="semibold" style={styles.fill}>
              {chosen === undefined ? words.t('study.nav.choose') : chosen.name}
            </Say>
            <GlassIconButton label={words.t('common.close')} size={theme.space.sp13} onPress={onClose}>
              <Icon name="chevronDown" />
            </GlassIconButton>
          </View>
          <SectionList
            sections={sections}
            keyExtractor={(row) => row.key}
            stickySectionHeadersEnabled={false}
            ItemSeparatorComponent={() => <Gap size={theme.space.sp3} />}
            SectionSeparatorComponent={() => <Gap size={theme.space.sp4} />}
            renderSectionHeader={({ section }) => (
              <Say role="overline" tone="dim" style={{ paddingTop: theme.space.sp4 }}>
                {section.title}
              </Say>
            )}
            renderItem={({ item: row }) => (
              <View style={[styles.row, { gap: theme.space.sp3 }]}>
                {row.picks.map((pick) => (
                  <View key={pick.key} style={styles.fill}>
                    <GlassButton
                      variant={pick.chosen ? 'dark' : 'glass'}
                      size="sm"
                      full
                      {...(pick.name === undefined ? {} : { accessibilityLabel: pick.name })}
                      onPress={pick.choose}
                    >
                      {pick.label}
                    </GlassButton>
                  </View>
                ))}
                {Array.from({ length: row.columns - row.picks.length }, (_, index) => (
                  <View key={`empty-${index}`} style={styles.fill} />
                ))}
              </View>
            )}
          />
        </GlassSurface>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: { flex: 1, justifyContent: 'flex-end' },
  fill: { flex: 1 },
  sheet: { maxHeight: '80%' },
  row: { flexDirection: 'row', alignItems: 'center' },
});
