import { describe, expect, it } from 'vitest';
import { imageNameOf, parseStory, storyNumberOf } from './stories';

const story = `# 1. The Creation

![OBS Image](https://cdn.door43.org/obs/jpg/360px/obs-en-01-01.jpg)

This is how the beginning of everything happened.
God created the universe.

![OBS Image](https://cdn.door43.org/obs/jpg/360px/obs-en-01-02.jpg)

God said, "Let there be light!"

Then there was light.

_A Bible story from: Genesis 1-2_
`;

describe('parseStory', () => {
  it('reads the title, the frames with their images, and the Bible reference line', () => {
    expect(parseStory(1, story)).toEqual({
      number: 1,
      title: 'The Creation',
      frames: [
        {
          number: 1,
          text: 'This is how the beginning of everything happened. God created the universe.',
          imageName: 'obs-en-01-01.jpg',
        },
        {
          number: 2,
          text: 'God said, "Let there be light!"\n\nThen there was light.',
          imageName: 'obs-en-01-02.jpg',
        },
      ],
      bibleReference: 'A Bible story from: Genesis 1-2',
      references: ['GEN 1-2'],
    });
  });

  it('keeps a localized reference line it cannot parse, and a frame with no image', () => {
    const parsed = parseStory(2, '# 2. Dhambi\n\nMaandishi bila picha.\n\n_Hadithi kutoka: Mwanzo 3_\n');
    expect(parsed.frames).toEqual([{ number: 1, text: 'Maandishi bila picha.' }]);
    expect(parsed.bibleReference).toBe('Hadithi kutoka: Mwanzo 3');
    expect(parsed.references).toEqual([]);
  });

  it('names stories only from content/01.md to content/50.md', () => {
    expect(storyNumberOf('content/07.md')).toBe(7);
    expect(storyNumberOf('content/51.md')).toBeUndefined();
    expect(storyNumberOf('content/front/intro.md')).toBeUndefined();
    expect(imageNameOf('https://cdn.door43.org/obs/jpg/360px/obs-en-01-01.jpg?x=1')).toBe('obs-en-01-01.jpg');
  });
});
