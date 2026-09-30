import { describe, expect, it } from 'vitest';
import { blocksText, renderMarkdown, type RenderContext } from './markdown';

const context: RenderContext = {
  base: { resource: 'tw', path: 'bible/kt/love.md' },
  titleOf: (target) =>
    target.kind === 'article' && target.id === 'tw/bible/kt/truth' ? 'truth, true' : undefined,
};

describe('renderMarkdown', () => {
  it('renders headings, paragraphs, emphasis and lists as typed blocks with no HTML', () => {
    const blocks = renderMarkdown(
      '# Love\n\nTo *love* is **to** care.<br>Always.\n\n1. One\n1. Two\n\n> Quoted\n\n<div>raw</div>',
      context,
    );
    expect(blocks).toEqual([
      { kind: 'heading', level: 1, children: [{ kind: 'text', text: 'Love' }] },
      {
        kind: 'paragraph',
        children: [
          { kind: 'text', text: 'To ' },
          { kind: 'emphasis', children: [{ kind: 'text', text: 'love' }] },
          { kind: 'text', text: ' is ' },
          { kind: 'strong', children: [{ kind: 'text', text: 'to' }] },
          { kind: 'text', text: ' care.\nAlways.' },
        ],
      },
      {
        kind: 'list',
        ordered: true,
        items: [
          [{ kind: 'paragraph', children: [{ kind: 'text', text: 'One' }] }],
          [{ kind: 'paragraph', children: [{ kind: 'text', text: 'Two' }] }],
        ],
      },
      { kind: 'quote', children: [{ kind: 'paragraph', children: [{ kind: 'text', text: 'Quoted' }] }] },
    ]);
    expect(JSON.stringify(blocks)).not.toContain('<');
  });

  it('turns a bare resource container link into a link titled from the corpus', () => {
    expect(
      renderMarkdown('See [[rc://*/tw/dict/bible/kt/truth]] and [[rc://*/tw/dict/bible/kt/grace]].', context),
    ).toEqual([
      {
        kind: 'paragraph',
        children: [
          { kind: 'text', text: 'See ' },
          {
            kind: 'link',
            children: [{ kind: 'text', text: 'truth, true' }],
            target: { kind: 'article', id: 'tw/bible/kt/truth' },
          },
          { kind: 'text', text: ' and ' },
          {
            kind: 'link',
            children: [{ kind: 'text', text: 'grace' }],
            target: { kind: 'article', id: 'tw/bible/kt/grace' },
          },
          { kind: 'text', text: '.' },
        ],
      },
    ]);
  });

  it('keeps the text of a link it cannot resolve, with no target', () => {
    expect(renderMarkdown('[Elsewhere](https://example.org) and ![image](x.jpg)', context)).toEqual([
      {
        kind: 'paragraph',
        children: [
          { kind: 'link', children: [{ kind: 'text', text: 'Elsewhere' }] },
          { kind: 'text', text: ' and ' },
        ],
      },
    ]);
  });

  it('flattens blocks to plain text for the index', () => {
    expect(blocksText(renderMarkdown('# Title\n\n* one [two](../kt/god.md)\n* three', context))).toBe(
      'Title\none two\nthree',
    );
  });
});
