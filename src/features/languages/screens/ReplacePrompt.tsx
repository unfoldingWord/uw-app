import { View } from 'react-native';
import { GlassButton } from '@shared/glass';
import { useTheme } from '@shared/theme';
import { Notice } from '@shared/ui';
import type { ReplaceQuestion } from '../service';

export type ReplacePromptProps = {
  question: ReplaceQuestion;
  onReplace: () => Promise<void>;
  onKeep: () => Promise<void>;
};

export function ReplacePrompt({ question, onReplace, onKeep }: ReplacePromptProps) {
  const theme = useTheme();
  return (
    <Notice
      text={question.question}
      action={
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.space.sp4 }}>
          <GlassButton size="sm" variant="dark" onPress={onReplace}>
            {question.replace}
          </GlassButton>
          <GlassButton size="sm" variant="quiet" onPress={onKeep}>
            {question.keep}
          </GlassButton>
        </View>
      }
    />
  );
}
