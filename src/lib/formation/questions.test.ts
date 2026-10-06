import { describe, expect, it } from 'vitest';
import type { Block } from '../corpus/types';
import { questionsOf } from './questions';

const paragraph = (text: string): Block => ({ kind: 'paragraph', children: [{ kind: 'text', text }] });

describe('movement questions (FO-3)', () => {
  it('takes the list items of a movement as its questions when it has a list', () => {
    expect(
      questionsOf([
        paragraph('Read the story twice.'),
        {
          kind: 'list',
          ordered: true,
          items: [
            [paragraph('What happens?')],
            [
              {
                kind: 'paragraph',
                children: [
                  { kind: 'strong', children: [{ kind: 'text', text: 'Who' }] },
                  { kind: 'text', text: ' acts?' },
                ],
              },
            ],
          ],
        },
      ]),
    ).toEqual({ source: 'list', items: ['What happens?', 'Who acts?'] });
  });

  it('takes each paragraph as a question when the movement has no list', () => {
    expect(
      questionsOf([{ kind: 'heading', level: 2, children: [] }, paragraph('Retell it. '), paragraph(' ')]),
    ).toEqual({ source: 'paragraphs', items: ['Retell it.'] });
  });
});
