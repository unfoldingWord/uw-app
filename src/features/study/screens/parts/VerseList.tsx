import { memo, useEffect, useMemo, useRef, type ReactElement } from 'react';
import { FlatList, Pressable, StyleSheet, Text, type TextStyle } from 'react-native';
import { useTheme } from '@shared/theme';
import type { Passage, Verse } from '../../service';
import { keyOf, sameVerse, type VerseKey } from './passage';
import { Say } from './Say';
import { contentText, type Direction } from './script';

export type VerseListProps = {
  passage: Passage;
  language: string;
  selected: VerseKey | undefined;
  highlighted: ReadonlySet<number>;
  verseLabel: (verse: Verse) => string;
  onSelect: (verse: VerseKey) => void;
  footer?: ReactElement;
};

type RowProps = {
  verse: Verse;
  active: boolean;
  highlighted: ReadonlySet<number>;
  text: TextStyle;
  label: string;
  onSelect: (verse: VerseKey) => void;
};

const VerseRow = memo(function VerseRow({ verse, active, highlighted, text, label, onSelect }: RowProps) {
  const theme = useTheme();
  const number =
    verse.through === undefined ? String(verse.verse) : `${String(verse.verse)}-${String(verse.through)}`;
  const mark = { backgroundColor: theme.color.glassFillTint, color: theme.color.accentDeepText };
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
      onPress={() => onSelect(keyOf(verse))}
      style={[
        styles.row,
        {
          gap: theme.space.sp6,
          paddingVertical: theme.space.sp5,
          paddingHorizontal: theme.space.sp6,
          borderRadius: theme.radius.rSm,
          backgroundColor: active ? theme.color.glassFill2 : undefined,
        },
      ]}
    >
      <Say role="caption" tone="faint" weight="semibold" style={{ minWidth: theme.space.sp9 }}>
        {number}
      </Say>
      <Text selectable style={[styles.fill, text, { color: theme.color.textTitle }]}>
        {verse.tokens.length === 0
          ? verse.text
          : verse.tokens.map((token, index) =>
              token.kind === 'word' && active && highlighted.has(token.index) ? (
                <Text key={String(index)} style={mark}>
                  {token.text}
                </Text>
              ) : (
                token.text
              ),
            )}
      </Text>
    </Pressable>
  );
});

export function VerseList({
  passage,
  language,
  selected,
  highlighted,
  verseLabel,
  onSelect,
  footer,
}: VerseListProps) {
  const theme = useTheme();
  const list = useRef<FlatList<Verse>>(null);
  const direction: Direction = passage.text.direction;
  const verses = passage.text.verses;
  const text = useMemo(() => {
    const base = theme.text.body;
    const size = theme.fontSize.fsSubtitle;
    return contentText(
      theme,
      { ...base, fontSize: size, lineHeight: size * theme.lineHeight.lhBody },
      {
        language,
        sample: verses
          .slice(0, 3)
          .map((verse) => verse.text)
          .join(' '),
        direction,
      },
    );
  }, [theme, language, verses, direction]);
  const selectedIndex = verses.findIndex((verse) => sameVerse(selected, keyOf(verse)));
  useEffect(() => {
    if (selectedIndex > 0) {
      list.current?.scrollToIndex({ index: selectedIndex, animated: false, viewPosition: 0.2 });
    }
  }, [passage.reference, selectedIndex]);
  return (
    <FlatList
      ref={list}
      data={verses}
      keyExtractor={(verse) => `${String(verse.chapter)}:${String(verse.verse)}`}
      renderItem={({ item }) => {
        const active = sameVerse(selected, keyOf(item));
        return (
          <VerseRow
            verse={item}
            active={active}
            highlighted={active ? highlighted : emptySet}
            text={text}
            label={verseLabel(item)}
            onSelect={onSelect}
          />
        );
      }}
      extraData={`${selectedIndex}:${[...highlighted].join(',')}`}
      onScrollToIndexFailed={({ index }) => {
        list.current?.scrollToOffset({
          offset: index * (text.lineHeight ?? theme.fontSize.fsSubtitle) * 2,
          animated: false,
        });
      }}
      initialNumToRender={20}
      windowSize={11}
      ListFooterComponent={footer}
      style={[styles.fill, { direction }]}
      contentContainerStyle={{
        paddingHorizontal: theme.space.sp6,
        paddingTop: theme.space.sp7,
        paddingBottom: theme.space.sp8,
      }}
    />
  );
}

const emptySet: ReadonlySet<number> = new Set();

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start' },
  fill: { flex: 1 },
});
