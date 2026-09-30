import type { Block, Inline } from '../corpus/types';

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

export function questionsOf(blocks: readonly Block[]): readonly string[] {
  const items = listItems(blocks);
  const found =
    items.length > 0
      ? items
      : blocks.filter((block) => block.kind === 'paragraph').map((block) => blockText(block));
  return found.map((text) => text.trim()).filter((text) => text !== '');
}
