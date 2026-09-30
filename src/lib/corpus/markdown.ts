import { Lexer, type Token as MarkedToken, type Tokens } from 'marked';
import { resolveLink, type LinkBase } from './links';
import type { Block, Inline, LinkTarget } from './types';

export type RenderContext = {
  readonly base: LinkBase;
  readonly titleOf: (target: LinkTarget) => string | undefined;
};

const bareRcLink = /\[\[(rc:\/\/[^\]\s]+)\]\]/g;

function withChildren(token: MarkedToken): readonly MarkedToken[] {
  return 'tokens' in token && Array.isArray(token.tokens) ? (token.tokens as MarkedToken[]) : [];
}

function plain(inlines: readonly Inline[]): string {
  return inlines.map((inline) => (inline.kind === 'text' ? inline.text : plain(inline.children))).join('');
}

function mergeText(inlines: readonly Inline[]): Inline[] {
  const merged: Inline[] = [];
  for (const inline of inlines) {
    const previous = merged.at(-1);
    if (inline.kind === 'text' && previous?.kind === 'text') {
      merged[merged.length - 1] = { kind: 'text', text: previous.text + inline.text };
    } else if (inline.kind !== 'text' || inline.text !== '') {
      merged.push(inline);
    }
  }
  return merged;
}

function inlines(tokens: readonly MarkedToken[], context: RenderContext): Inline[] {
  return mergeText(tokens.flatMap((token) => inline(token, context)));
}

function inline(token: MarkedToken, context: RenderContext): Inline[] {
  switch (token.type) {
    case 'em':
      return [{ kind: 'emphasis', children: inlines(withChildren(token), context) }];
    case 'strong':
      return [{ kind: 'strong', children: inlines(withChildren(token), context) }];
    case 'link': {
      const link = token as Tokens.Link;
      const target = resolveLink(link.href, context.base);
      const children = inlines(withChildren(token), context);
      const bare = plain(children) === link.href;
      const title = bare && target !== undefined ? context.titleOf(target) : undefined;
      const shown: Inline[] = bare
        ? [{ kind: 'text', text: title ?? link.href.split('/').at(-1) ?? link.href }]
        : children;
      return [
        target === undefined ? { kind: 'link', children: shown } : { kind: 'link', children: shown, target },
      ];
    }
    case 'br':
      return [{ kind: 'text', text: '\n' }];
    case 'image':
    case 'html':
      return [];
    case 'text':
      return withChildren(token).length > 0
        ? inlines(withChildren(token), context)
        : [{ kind: 'text', text: token.text }];
    case 'codespan':
    case 'escape':
    case 'del':
      return [{ kind: 'text', text: 'text' in token ? String(token.text) : '' }];
    default:
      return 'text' in token && typeof token.text === 'string' ? [{ kind: 'text', text: token.text }] : [];
  }
}

function blocks(tokens: readonly MarkedToken[], context: RenderContext): Block[] {
  return tokens.flatMap((token) => block(token, context));
}

function block(token: MarkedToken, context: RenderContext): Block[] {
  switch (token.type) {
    case 'heading':
      return [
        {
          kind: 'heading',
          level: (token as Tokens.Heading).depth,
          children: inlines(withChildren(token), context),
        },
      ];
    case 'paragraph': {
      const children = inlines(withChildren(token), context);
      return children.length === 0 ? [] : [{ kind: 'paragraph', children }];
    }
    case 'text':
      return [
        {
          kind: 'paragraph',
          children: inlines(withChildren(token).length > 0 ? withChildren(token) : [token], context),
        },
      ];
    case 'list': {
      const list = token as Tokens.List;
      return [
        {
          kind: 'list',
          ordered: list.ordered,
          items: list.items.map((item) => blocks(item.tokens, context)),
        },
      ];
    }
    case 'blockquote':
      return [{ kind: 'quote', children: blocks(withChildren(token), context) }];
    case 'code':
      return [{ kind: 'paragraph', children: [{ kind: 'text', text: (token as Tokens.Code).text }] }];
    default:
      return [];
  }
}

export function renderMarkdown(text: string, context: RenderContext): Block[] {
  const prepared = text
    .replace(bareRcLink, (_, href: string) => `[\`${href}\`](${href})`)
    .replace(/<br\s*\/?>/gi, '\n');
  return blocks(Lexer.lex(prepared), context);
}

export function blocksText(content: readonly Block[]): string {
  return content
    .map((item) => {
      switch (item.kind) {
        case 'heading':
        case 'paragraph':
          return plain(item.children);
        case 'list':
          return item.items.map(blocksText).join('\n');
        case 'quote':
          return blocksText(item.children);
      }
    })
    .join('\n');
}
