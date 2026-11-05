import { StyleSheet, View } from 'react-native';
import { Icon } from '@shared/glass';
import { useTheme } from '@shared/theme';
import { Card, Tappable, ThemedText } from '@shared/ui';
import type { FormationWords, StoryTitle } from '../../service';

export type StoryListProps = {
  words: FormationWords;
  stories: readonly StoryTitle[];
  current: number;
  onChoose: (story: number) => void;
};

export function StoryList({ words, stories, current, onChoose }: StoryListProps) {
  const theme = useTheme();
  return (
    <Card level={1}>
      <ThemedText variant="overline" tone="dim" accessibilityRole="header">
        {words.t('session.story.list')}
      </ThemedText>
      {stories.map((story) => {
        const here = story.number === current;
        const label = words.t('common.joined', {
          first: words.t('session.overline', { number: story.number, total: stories.length }),
          second: story.title,
        });
        return (
          <Tappable
            key={story.number}
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
                <View style={styles.title}>
                  <ThemedText
                    variant="body"
                    tone="title"
                    weight={here ? theme.fontWeight.fwSemibold : undefined}
                  >
                    {story.title}
                  </ThemedText>
                </View>
                {here ? <Icon name="check" size={theme.space.sp8} /> : null}
              </>
            )}
          </Tappable>
        );
      })}
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  title: { flex: 1, minWidth: 0 },
});
