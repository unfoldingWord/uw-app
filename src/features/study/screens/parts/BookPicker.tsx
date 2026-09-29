import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GlassButton, GlassIconButton, GlassSurface, Icon } from '@shared/glass';
import { useTheme } from '@shared/theme';
import type { BookEntry } from '../../service';
import type { StudyWords } from '../../strings';
import { Say } from './Say';

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
  const sections = (['old', 'new'] as const)
    .map((testament) => ({
      testament,
      title: words.t(testament === 'old' ? 'study.nav.oldTestament' : 'study.nav.newTestament'),
      books: books.filter((entry) => entry.testament === testament),
    }))
    .filter((section) => section.books.length > 0);
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
          <ScrollView contentContainerStyle={{ gap: theme.space.sp6 }}>
            {sections.map((section) => (
              <View key={section.testament} style={{ gap: theme.space.sp4 }}>
                <Say role="overline" tone="dim">
                  {section.title}
                </Say>
                <View style={[styles.wrap, { gap: theme.space.sp3 }]}>
                  {section.books.map((entry) => (
                    <GlassButton
                      key={entry.code}
                      variant={entry.code === book ? 'dark' : 'glass'}
                      size="sm"
                      onPress={() => {
                        const [only] = entry.chapters;
                        if (entry.chapters.length === 1 && only !== undefined) {
                          onChoose(entry.code, only);
                          return;
                        }
                        setBook(entry.code);
                      }}
                    >
                      {entry.name}
                    </GlassButton>
                  ))}
                </View>
              </View>
            ))}
            {chosen === undefined || chosen.chapters.length < 2 ? null : (
              <View style={{ gap: theme.space.sp4 }}>
                <Say role="overline" tone="dim">
                  {chosen.name}
                </Say>
                <View style={[styles.wrap, { gap: theme.space.sp3 }]}>
                  {chosen.chapters.map((chapter) => {
                    const here = current?.book === chosen.code && current.chapter === chapter;
                    return (
                      <GlassButton
                        key={String(chapter)}
                        variant={here ? 'dark' : 'glass'}
                        size="sm"
                        accessibilityLabel={words.t('study.nav.chapter', { chapter: String(chapter) })}
                        onPress={() => onChoose(chosen.code, chapter)}
                      >
                        {String(chapter)}
                      </GlassButton>
                    );
                  })}
                </View>
              </View>
            )}
          </ScrollView>
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
  wrap: { flexDirection: 'row', flexWrap: 'wrap' },
});
