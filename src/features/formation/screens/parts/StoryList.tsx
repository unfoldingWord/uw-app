import { Image, StyleSheet, View } from 'react-native';
import { Icon } from '@shared/glass';
import { useTheme } from '@shared/theme';
import { Card, prototypeValues, Tappable, ThemedText } from '@shared/ui';
import type { FormationWords, StoryTitle } from '../../service';

export type StoryRowProps = {
  words: FormationWords;
  story: StoryTitle;
  total: number;
  current?: number;
  onChoose: (story: number) => void;
};

export function StoryRow({ words, story, total, current, onChoose }: StoryRowProps) {
  const theme = useTheme();
  const here = story.number === current;
  const label = words.t('common.joined', {
    first: words.t('session.overline', { number: story.number, total }),
    second: story.title,
  });
  return (
    <Tappable
      accessibilityLabel={label}
      selected={here}
      radius={theme.radius.rLg}
      onPress={() => onChoose(story.number)}
      style={[
        styles.row,
        {
          gap: theme.space.sp4,
          paddingVertical: theme.space.sp4,
          paddingHorizontal: theme.space.sp4,
          backgroundColor: here ? theme.color.glassFill3 : undefined,
        },
      ]}
    >
      {() => (
        <>
          <ThemedText variant="label" tone="dim" style={{ minWidth: theme.space.sp10 }}>
            {String(story.number)}
          </ThemedText>
          {story.picture === undefined ? null : (
            <Image
              source={{ uri: story.picture }}
              resizeMode="cover"
              accessibilityElementsHidden
              importantForAccessibility="no"
              style={{
                width: prototypeValues.row.iconTile,
                height: prototypeValues.row.iconTile,
                borderRadius: theme.radius.rSm,
                backgroundColor: theme.color.glassFill3,
              }}
            />
          )}
          <View style={styles.title}>
            <ThemedText variant="body" tone="title" weight={here ? theme.fontWeight.fwSemibold : undefined}>
              {story.title}
            </ThemedText>
          </View>
          {here ? <Icon name="check" size={theme.space.sp8} /> : null}
        </>
      )}
    </Tappable>
  );
}

export type StoryListProps = {
  words: FormationWords;
  stories: readonly StoryTitle[];
  current: number;
  onChoose: (story: number) => void;
};

export function StoryList({ words, stories, current, onChoose }: StoryListProps) {
  return (
    <Card level={1}>
      <ThemedText variant="overline" tone="dim" accessibilityRole="header">
        {words.t('session.story.list')}
      </ThemedText>
      {stories.map((story) => (
        <StoryRow
          key={story.number}
          words={words}
          story={story}
          total={stories.length}
          current={current}
          onChoose={onChoose}
        />
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  title: { flex: 1, minWidth: 0 },
});
