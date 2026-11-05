import { View } from 'react-native';
import { useTheme } from '@shared/theme';
import { Notice } from '@shared/ui';
import type { CopyReference, CopyReferenceChoice } from '../../service';
import type { StudyWords } from '../../strings';
import { Choices } from './Choices';
import { Say } from './Say';

export type CopyState =
  | { readonly state: 'idle' }
  | { readonly state: 'copied'; readonly label: string }
  | { readonly state: 'failed'; readonly text: string };

export type CopyPanelProps = {
  words: StudyWords;
  copy: CopyState;
  ranged: boolean;
  formats: readonly CopyReferenceChoice[];
  onFormat: (format: CopyReference) => void;
};

export function CopyPanel({ words, copy, ranged, formats, onFormat }: CopyPanelProps) {
  const theme = useTheme();
  if (copy.state === 'idle') {
    return ranged ? null : (
      <Say role="caption" tone="dim">
        {words.t('study.copy.hint')}
      </Say>
    );
  }
  if (copy.state === 'failed') {
    return <Notice text={copy.text} />;
  }
  return (
    <View style={{ gap: theme.space.sp3 }}>
      <Notice text={copy.label} tone="ready" />
      <Choices label={words.t('study.copy.format')} choices={formats} onChoose={onFormat} compact />
    </View>
  );
}
