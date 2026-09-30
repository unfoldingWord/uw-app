type Frame = { readonly text: string };

export type Story = {
  readonly number: number;
  readonly title: string;
  readonly frames: readonly Frame[];
  readonly reference: string;
};

export type FormationSection = { readonly id: string; readonly heading: string; readonly body: string };

export type FormationSession = { readonly story: number; readonly sections: readonly FormationSection[] };

const baseStories: readonly Story[] = [
  {
    number: 1,
    title: 'The Creation',
    reference: 'Genesis 1-2',
    frames: [
      {
        text: 'This is how the beginning of everything happened. God created the universe and everything in it in six days.',
      },
      { text: 'God said, "Let there be light!" And there was light. God saw that the light was good.' },
      {
        text: 'God formed a man from the soil and breathed life into him. God placed him in a beautiful garden.',
      },
    ],
  },
  {
    number: 2,
    title: 'Sin Enters the World',
    reference: 'Genesis 3',
    frames: [
      {
        text: 'Adam and his wife lived in the garden God had made. They were happy and they were not ashamed.',
      },
      {
        text: 'But a snake deceived the woman, and she and her husband ate the fruit God had told them not to eat.',
      },
    ],
  },
  {
    number: 3,
    title: 'The Flood',
    reference: 'Genesis 6-8',
    frames: [
      {
        text: 'After a long time, many people lived in the world, and they became very wicked. The earth was full of violence.',
      },
      {
        text: 'But Noah pleased God. God told Noah to build a large boat because he was going to send a great flood.',
      },
    ],
  },
];

export type StoryLanguage = 'qaa' | 'qab' | 'en';

export function storiesFor(language: StoryLanguage): readonly Story[] {
  if (language !== 'qab') {
    return baseStories;
  }
  return baseStories.map((story) => ({
    ...story,
    frames: story.frames.map((frame) => ({ text: frame.text.replaceAll('God', 'Yahweh') })),
  }));
}

export function frameImageName(story: number, frame: number): string {
  return `obs-en-${String(story).padStart(2, '0')}-${String(frame).padStart(2, '0')}.jpg`;
}

function frameImageUrl(story: number, frame: number): string {
  return `https://cdn.door43.org/obs/jpg/360px/${frameImageName(story, frame)}`;
}

export function storyMarkdown(story: Story): string {
  return [
    `# ${story.number}. ${story.title}`,
    '',
    ...story.frames.flatMap((frame, index) => [
      `![OBS Image](${frameImageUrl(story.number, index + 1)})`,
      '',
      frame.text,
      '',
    ]),
    `_A Bible story from: ${story.reference}_`,
    '',
  ].join('\n');
}

export function storyFileName(story: number): string {
  return `content/${String(story).padStart(2, '0')}.md`;
}

const section = (id: string, heading: string, body: string): FormationSection => ({ id, heading, body });

const movements = (story: string): FormationSection[] => [
  section(
    'observation',
    'Observation',
    `Read the story of ${story} together twice.\n\n1. What happens in this story?\n1. What does God do?`,
  ),
  section(
    'translation',
    'Translation',
    'Retell the story in your own words, the way you would tell a neighbour.',
  ),
  section(
    'discourse',
    'Discourse',
    'Talk together: what does this story show about how people respond to God?',
  ),
  section('theological', 'Theological', 'What does this story teach about who God is and what he does?'),
  section('journal', 'Journal', 'Write one sentence about what you will remember from this story this week.'),
];

export const formationSessions: readonly FormationSession[] = [
  {
    story: 1,
    sections: [
      section('key-idea', 'Key idea', 'God made everything, and everything he made was good.'),
      section(
        'creedal-verse',
        'Creedal verse',
        '> In the beginning, God created the heavens and the earth.\n\n[Genesis 1:1](rc://*/ult/book/gen/01/01)',
      ),
      section('summary', 'Summary', 'God created the world in six days and made people to live with him.'),
      ...movements('the creation'),
      section('drafting', 'Drafting', 'Write the story in your language from memory, one frame at a time.'),
      section(
        'checking',
        'Checking',
        'Read your draft to someone who has not heard the story and ask them to retell it.',
      ),
      section('conclusion', 'Conclusion', 'Pray together and thank God for all that he made.'),
    ],
  },
  {
    story: 2,
    sections: [
      section('key-idea', 'Key idea', 'People chose to disobey God, and sin entered the world.'),
      section(
        'creedal-verse',
        'Creedal verse',
        '> Sin entered into the world through one man, and death through sin.\n\n[Romans 5:12](rc://*/ult/book/rom/05/12)',
      ),
      section(
        'summary',
        'Summary',
        'Adam and his wife ate the fruit God had forbidden, and their trust in God was broken.',
      ),
      ...movements('sin entering the world'),
    ],
  },
  {
    story: 3,
    sections: [
      section('key-idea', 'Key idea', 'God judges evil and saves those who trust him.'),
      section(
        'creedal-verse',
        'Creedal verse',
        '> By faith, Noah, being warned about things not yet seen, prepared a ship for the saving of his house.\n\n[Hebrews 11:7](rc://*/ult/book/heb/11/07)',
      ),
      section('summary', 'Summary', 'God saved Noah and his family from the flood that covered the earth.'),
      ...movements('the flood'),
    ],
  },
];

export function sectionMarkdown(formationSection: FormationSection): string {
  return `# ${formationSection.heading}\n\n${formationSection.body}\n`;
}
