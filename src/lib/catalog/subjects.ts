import type { ResourceRow } from '../domain/pack';

const rowsBySubject: Readonly<Record<string, ResourceRow>> = {
  'Aligned Bible': 'text',
  Bible: 'text',
  'Hebrew Old Testament': 'text',
  'Greek New Testament': 'text',
  'TSV Translation Notes': 'notes',
  'Translation Notes': 'notes',
  'TSV Study Notes': 'notes',
  'Study Notes': 'notes',
  'TSV Translation Words Links': 'wordLinks',
  'Translation Words Links': 'wordLinks',
  'TSV Translation Questions': 'questions',
  'Translation Questions': 'questions',
  'TSV Study Questions': 'questions',
  'Study Questions': 'questions',
  'Translation Words': 'articles',
  'Translation Academy': 'articles',
  'Open Bible Stories': 'stories',
  'TSV OBS Translation Notes': 'storyHelps',
  'OBS Translation Notes': 'storyHelps',
  'TSV OBS Study Notes': 'storyHelps',
  'OBS Study Notes': 'storyHelps',
  'TSV OBS Study Questions': 'storyHelps',
  'OBS Study Questions': 'storyHelps',
  'TSV OBS Translation Questions': 'storyHelps',
  'OBS Translation Questions': 'storyHelps',
  'TSV OBS Translation Words Links': 'storyHelps',
  'OBS Theological Formation': 'formation',
  'Bible Audio': 'audio',
  'OBS Audio': 'audio',
  'OBS Images': 'images',
};

export function rowOfSubject(subject: string): ResourceRow | undefined {
  return rowsBySubject[subject];
}
