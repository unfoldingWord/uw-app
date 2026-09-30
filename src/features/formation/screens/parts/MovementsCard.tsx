import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { GlassButton, Icon } from '@shared/glass';
import { useTheme } from '@shared/theme';
import type { FormationWords, SessionMovement, SessionMovementId } from '../../service';
import { Blocks } from './Blocks';
import { Card } from './Card';
import { Line } from './Line';
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
  return (
    <Card level={2}>
      <Line role="overline" tone="dim" accessibilityRole="header">
        {words.t('session.talk.source', { language: source })}
      </Line>
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
      {movement.questions.length > 0 ? (
        <View style={{ gap: theme.space.sp6 }}>
          {movement.questions.map((question, index) => (
            <Line key={index} role="body" tone="body">
              {question}
            </Line>
          ))}
        </View>
      ) : (
        <Blocks blocks={movement.blocks} language={language} />
      )}
      {onComplete === undefined ? null : finished ? (
        <View style={[styles.done, { gap: theme.space.sp3 }]}>
          <Icon name="check" size={theme.space.sp8} />
          <Line role="label" tone="dim">
            {words.t('common.joined', { first: title, second: words.t('common.done') })}
          </Line>
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
      hitSlop={{ top: theme.space.sp4, bottom: theme.space.sp4 }}
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
      <Line role="caption" tone="title" weight={theme.fontWeight.fwMedium}>
        {label}
      </Line>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: { flexDirection: 'row', alignItems: 'center' },
  done: { flexDirection: 'row', alignItems: 'center' },
});
