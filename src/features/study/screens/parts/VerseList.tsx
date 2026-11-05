import { memo, useLayoutEffect, useMemo, useRef, type ReactElement } from 'react';
import { FlatList, Pressable, StyleSheet, Text, type TextStyle, type ViewToken } from 'react-native';
import { contentText, type Direction, useTheme } from '@shared/theme';
import type { Passage, Verse } from '../../service';
import {
  keyOf,
  middleOf,
  sameVerse,
  scrollMove,
  scrollPlan,
  type ListPlace,
  type ScrollPlan,
  type VerseKey,
} from './passage';
import { Say } from './Say';

export type VerseListProps = {
  passage: Passage;
  language: string;
  selected: VerseKey | undefined;
  landing?: VerseKey;
  highlighted: ReadonlySet<number>;
  verseLabel: (verse: Verse) => string;
  onSelect: (verse: VerseKey) => void;
  footer?: ReactElement;
};

type RowProps = {
  verse: Verse;
  title: string | undefined;
  active: boolean;
  highlighted: ReadonlySet<number>;
  text: TextStyle;
  label: string;
  onSelect: (verse: VerseKey) => void;
};

const VerseRow = memo(function VerseRow({
  verse,
  title,
  active,
  highlighted,
  text,
  label,
  onSelect,
}: RowProps) {
  const theme = useTheme();
  const number =
    verse.through === undefined ? String(verse.verse) : `${String(verse.verse)}-${String(verse.through)}`;
  const mark = { backgroundColor: theme.color.glassFillTint, color: theme.color.accentDeepText };
  const row = (
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
  if (title === undefined) {
    return row;
  }
  return (
    <>
      <Text
        selectable
        accessibilityRole="header"
        style={[
          text,
          {
            color: theme.color.textBody,
            paddingTop: theme.space.sp5,
            paddingHorizontal: theme.space.sp6,
          },
        ]}
      >
        {title}
      </Text>
      {row}
    </>
  );
});

export function VerseList({
  passage,
  language,
  selected,
  landing,
  highlighted,
  verseLabel,
  onSelect,
  footer,
}: VerseListProps) {
  const theme = useTheme();
  const list = useRef<FlatList<Verse>>(null);
  const retries = useRef(0);
  const viewPosition = useRef(0.2);
  const direction: Direction = passage.text.direction;
  const verses = passage.text.verses;
  const titles = useMemo(
    () => new Map(passage.text.titles.map((item) => [item.chapter, item.text])),
    [passage.text.titles],
  );
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
  const placed = useRef<ListPlace | undefined>(undefined);
  const inView = useRef<VerseKey | undefined>(undefined);
  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken<Verse>[] }) => {
    inView.current = middleOf(viewableItems.map((token) => keyOf(token.item)));
  }).current;
  const scrollTo = (plan: ScrollPlan) => {
    switch (plan.kind) {
      case 'top':
        list.current?.scrollToOffset({ offset: 0, animated: false });
        return;
      case 'end':
        list.current?.scrollToEnd({ animated: false });
        return;
      case 'index':
        list.current?.scrollToIndex({ index: plan.index, animated: false, viewPosition: plan.viewPosition });
        return;
    }
  };
  const reading = passage.text.reading;
  useLayoutEffect(() => {
    const now: ListPlace = { chapter: passage.reference, reading, landing, selected };
    const move = scrollMove(placed.current, now, inView.current);
    placed.current = now;
    const plan = move === undefined ? undefined : scrollPlan(move, verses);
    if (plan !== undefined) {
      retries.current = 0;
      viewPosition.current = plan.kind === 'index' ? plan.viewPosition : viewPosition.current;
      scrollTo(plan);
    }
  });
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
            title={item.verse === 1 ? titles.get(item.chapter) : undefined}
            active={active}
            highlighted={active ? highlighted : emptySet}
            text={text}
            label={verseLabel(item)}
            onSelect={onSelect}
          />
        );
      }}
      extraData={`${selectedIndex}:${[...highlighted].join(',')}`}
      onScrollToIndexFailed={({ index, averageItemLength }) => {
        const estimate =
          averageItemLength > 0 ? averageItemLength : (text.lineHeight ?? theme.fontSize.fsSubtitle) * 2;
        list.current?.scrollToOffset({ offset: index * estimate, animated: false });
        requestAnimationFrame(() => {
          retries.current += 1;
          if (index < verses.length && retries.current <= maximumScrollRetries) {
            list.current?.scrollToIndex({ index, animated: false, viewPosition: viewPosition.current });
          }
        });
      }}
      onViewableItemsChanged={onViewableItemsChanged}
      viewabilityConfig={viewability}
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

const maximumScrollRetries = 3;

const viewability = { itemVisiblePercentThreshold: 50 };

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start' },
  fill: { flex: 1 },
});
