import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { GlassButton, Icon } from '@shared/glass';
import { touchSlop } from '@shared/glass/pressGate';
import { useTheme } from '@shared/theme';
import { Card, ThemedText } from '@shared/ui';
import type { Block, FormationWords, SessionMovement, SessionMovementId } from '../../service';
import { Blocks } from './Blocks';
import { movementChipExtent } from './touchExtent';
import { movementTitle } from './wording';

export type MovementsCardProps = {
  words: FormationWords;
  source: string;
  language?: string;
  movements: readonly SessionMovement[];
  selected: SessionMovementId;
  done: ReadonlySet<SessionMovementId>;
  onSelect: (movement: SessionMovementId) => void;
  onComplete?: () => Promise<unknown>;
};

function withoutLists(blocks: readonly Block[]): Block[] {
  return blocks.flatMap((block): Block[] => {
    if (block.kind === 'list') {
      return [];
    }
    if (block.kind === 'quote') {
      const children = withoutLists(block.children);
      return children.length === 0 ? [] : [{ ...block, children }];
    }
    return [block];
  });
}

export function MovementsCard({
  words,
  source,
  language,
  movements,
  selected,
  done,
  onSelect,
  onComplete,
}: MovementsCardProps) {
  const theme = useTheme();
  const movement = movements.find((item) => item.id === selected) ?? movements[0];
  const last = movements.at(-1)?.id;
  if (movement === undefined) {
    return null;
  }
  const title = movementTitle(words, movement.id);
  const finished = done.has(movement.id);
  const questions = movement.questions;
  const text = questions.source === 'list' ? withoutLists(movement.blocks) : [];
  return (
    <Card level={2}>
      <ThemedText variant="overline" tone="dim" accessibilityRole="header">
        {words.t('session.talk.source', { language: source })}
      </ThemedText>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        accessibilityRole="tablist"
        contentContainerStyle={{ gap: theme.space.sp3, paddingVertical: theme.space.sp2 }}
      >
        {movements.map((item) => (
          <MovementChip
            key={item.id}
            label={movementTitle(words, item.id)}
            active={item.id === movement.id}
            done={done.has(item.id)}
            onPress={() => onSelect(item.id)}
          />
        ))}
      </ScrollView>
      {text.length === 0 ? null : <Blocks blocks={text} language={language} />}
      {questions.items.length > 0 ? (
        <View style={{ gap: theme.space.sp6 }}>
          {questions.source === 'list' ? (
            <ThemedText variant="overline" tone="dim" accessibilityRole="header">
              {words.t('session.talk')}
            </ThemedText>
          ) : null}
          {questions.items.map((question, index) => (
            <ThemedText key={index} variant="body" tone="body">
              {question}
            </ThemedText>
          ))}
        </View>
      ) : (
        <Blocks blocks={movement.blocks} language={language} />
      )}
      {onComplete === undefined ? null : finished ? (
        <View style={[styles.done, { gap: theme.space.sp3 }]}>
          <Icon name="check" size={theme.space.sp8} />
          <ThemedText variant="label" tone="dim">
            {words.t('common.joined', { first: title, second: words.t('common.done') })}
          </ThemedText>
        </View>
      ) : (
        <GlassButton
          full
          variant="dark"
          accessibilityLabel={
            movement.id === last
              ? words.t('session.complete')
              : words.t('common.joined', { first: title, second: words.t('common.done') })
          }
          leading={<Icon name="check" size={theme.space.sp8} />}
          onPress={onComplete}
        >
          {movement.id === last ? words.t('session.complete') : words.t('common.done')}
        </GlassButton>
      )}
    </Card>
  );
}

type MovementChipProps = { label: string; active: boolean; done: boolean; onPress: () => void };

function MovementChip({ label, active, done, onPress }: MovementChipProps) {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityLabel={label}
      accessibilityState={{ selected: active, checked: done }}
      {...touchSlop(movementChipExtent(theme))}
      onPress={onPress}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={({ pressed }) => [
        styles.chip,
        {
          gap: theme.space.sp2,
          paddingHorizontal: theme.space.sp6,
          paddingVertical: theme.space.sp3,
          borderRadius: theme.radius.rPill,
          borderWidth: theme.border.borderHairline.width,
          borderColor: theme.border.borderHairline.color,
          backgroundColor: active ? theme.color.glassFill4 : 'transparent',
          transform: [{ scale: pressed ? theme.motion.pressScale : 1 }],
        },
        focused ? { boxShadow: theme.shadow.glowFocus.css } : null,
      ]}
    >
      {done ? <Icon name="check" size={theme.fontSize.fsCaption} /> : null}
      <ThemedText variant="caption" tone="title" weight={theme.fontWeight.fwMedium}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: { flexDirection: 'row', alignItems: 'center' },
  done: { flexDirection: 'row', alignItems: 'center' },
});
