import { bookByCode } from '../domain/books';
import { formatReference, type Reference } from '../domain/reference';
import type { LinkTarget } from './types';

export type LinkBase = { readonly resource: 'tw' | 'ta' | 'other'; readonly path: string };

export const wordsPrefix = 'tw';
export const academyPrefix = 'ta';

const rcPattern = /^rc:\/\/[^/]*\/(.+)$/;
const storiesSegment = 'obs';
const storyCount = 50;
const articleShape = /^[a-z0-9]+(\/[a-z0-9][a-z0-9_-]*){1,4}$/;
const numbered = /^\d{1,3}$/;

function articleId(prefix: string, path: string): string | undefined {
  const id = `${prefix}/${path.replace(/\.md$/, '')}`.toLowerCase();
  return articleShape.test(id) ? id : undefined;
}

export function wordsArticleId(path: string): string | undefined {
  return articleId(wordsPrefix, path);
}

export function academyArticleId(manual: string, slug: string): string | undefined {
  return articleId(academyPrefix, `${manual}/${slug}`);
}

function passageFrom(segments: readonly string[]): LinkTarget | undefined {
  const cleaned = segments
    .map((segment) => segment.replace(/\.md$/, '').toLowerCase())
    .filter((segment) => segment !== '');
  for (let at = cleaned.length - 1; at >= 0; at -= 1) {
    const book = bookByCode((cleaned[at] ?? '').toUpperCase());
    if (book === undefined) {
      continue;
    }
    const numbers = cleaned.slice(at + 1);
    if (numbers.length > 2 || !numbers.every((segment) => numbered.test(segment))) {
      return undefined;
    }
    const [chapterText, verseText] = numbers;
    const chapter = Number(chapterText ?? 1);
    if (chapter < 1 || chapter > book.chapters) {
      return undefined;
    }
    const reference: Reference =
      verseText === undefined || Number(verseText) < 1
        ? { book: book.code, start: { chapter } }
        : { book: book.code, start: { chapter, verse: Number(verseText) } };
    return { kind: 'passage', reference: formatReference(reference) };
  }
  return undefined;
}

function storyFrom(segments: readonly string[]): LinkTarget | undefined {
  const at = segments.lastIndexOf(storiesSegment);
  const number = segments[at + 1];
  if (at === -1 || number === undefined || !numbered.test(number)) {
    return undefined;
  }
  const story = Number(number);
  return story >= 1 && story <= storyCount ? { kind: 'story', story } : undefined;
}

function resolveRc(href: string): LinkTarget | undefined {
  const match = rcPattern.exec(href);
  if (match === null) {
    return undefined;
  }
  const segments = (match[1] ?? '').split('/').filter((segment) => segment !== '');
  const [resource = '', type = '', ...path] = segments;
  const rest = path.join('/');
  if (resource === wordsPrefix && type === 'dict' && rest !== '') {
    const id = wordsArticleId(rest);
    return id === undefined ? undefined : { kind: 'article', id };
  }
  if (resource === academyPrefix && type === 'man') {
    const [manual = '', slug = ''] = path;
    const id = academyArticleId(manual, slug);
    return id === undefined ? undefined : { kind: 'article', id };
  }
  if (segments.includes(storiesSegment)) {
    return storyFrom(segments);
  }
  return passageFrom(segments.slice(1));
}

function joinPath(base: string, relative: string): readonly string[] {
  const parts = base.split('/').slice(0, -1);
  for (const segment of relative.split('/')) {
    if (segment === '..') {
      parts.pop();
    } else if (segment !== '.' && segment !== '') {
      parts.push(segment);
    }
  }
  return parts;
}

function resolveRelative(href: string, base: LinkBase): LinkTarget | undefined {
  const target = href.split('#')[0] ?? '';
  const segments = joinPath(base.path, target);
  const passage = passageFrom(segments.slice(-3));
  if (
    passage !== undefined &&
    segments.slice(-2).every((segment) => numbered.test(segment.replace(/\.md$/, '')))
  ) {
    return passage;
  }
  if (!target.endsWith('.md')) {
    return undefined;
  }
  if (base.resource === 'tw') {
    const id = wordsArticleId(segments.join('/'));
    return id === undefined ? undefined : { kind: 'article', id };
  }
  if (base.resource === 'ta') {
    const [manual, slug] = segments;
    if (manual === undefined || slug === undefined || segments.length !== 3) {
      return undefined;
    }
    const id = academyArticleId(manual, slug);
    return id === undefined ? undefined : { kind: 'article', id };
  }
  return undefined;
}

export function resolveLink(href: string, base: LinkBase): LinkTarget | undefined {
  const trimmed = href.trim();
  if (trimmed.startsWith('rc://')) {
    return resolveRc(trimmed);
  }
  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed) || trimmed.startsWith('/') || trimmed.startsWith('#')) {
    return undefined;
  }
  return resolveRelative(trimmed, base);
}
