import { Card, ThemedText } from '@shared/ui';
import type { StoryQuestion } from '../../service';

export type TalkCardProps = {
  title: string;
  questions: readonly StoryQuestion[];
  live?: boolean;
};

export function TalkCard({ title, questions, live = false }: TalkCardProps) {
  if (questions.length === 0) {
    return null;
  }
  return (
    <Card level={2}>
      <ThemedText variant="overline" tone="dim" accessibilityRole="header" live={live}>
        {title}
      </ThemedText>
      {questions.map((question) => (
        <ThemedText key={question.id} variant="body" tone="body">
          {question.question}
        </ThemedText>
      ))}
    </Card>
  );
}
