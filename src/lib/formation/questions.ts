import type { Block, Inline } from '../corpus/types';
import type { MovementQuestions } from './types';

function inlineText(inlines: readonly Inline[]): string {
  return inlines
    .map((inline) => (inline.kind === 'text' ? inline.text : inlineText(inline.children)))
    .join('');
}

function blockText(block: Block): string {
  switch (block.kind) {
    case 'heading':
    case 'paragraph':
      return inlineText(block.children);
    case 'list':
      return block.items.map((item) => item.map(blockText).join(' ')).join(' ');
    case 'quote':
      return block.children.map(blockText).join(' ');
  }
}

function listItems(blocks: readonly Block[]): string[] {
  return blocks.flatMap((block) => {
    if (block.kind === 'list') {
      return block.items.map((item) => item.map(blockText).join(' '));
    }
    return block.kind === 'quote' ? listItems(block.children) : [];
  });
}

function cleaned(texts: readonly string[]): string[] {
  return texts.map((text) => text.trim()).filter((text) => text !== '');
}

export function questionsOf(blocks: readonly Block[]): MovementQuestions {
  const items = listItems(blocks);
  if (items.length > 0) {
    return { source: 'list', items: cleaned(items) };
  }
  return {
    source: 'paragraphs',
    items: cleaned(blocks.filter((block) => block.kind === 'paragraph').map((block) => blockText(block))),
  };
}
