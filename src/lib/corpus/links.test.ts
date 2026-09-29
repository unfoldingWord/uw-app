import { describe, expect, it } from 'vitest';
import { resolveLink, type LinkBase } from './links';

const word: LinkBase = { resource: 'tw', path: 'bible/kt/love.md' };
const academy: LinkBase = { resource: 'ta', path: 'translate/figs-metaphor/01.md' };
const note: LinkBase = { resource: 'other', path: '' };

describe('resolveLink', () => {
  it('resolves resource container links to Words and Academy articles', () => {
    expect(resolveLink('rc://*/tw/dict/bible/kt/love', note)).toEqual({
      kind: 'article',
      id: 'tw/bible/kt/love',
    });
    expect(resolveLink('rc://en/tw/dict/bible/names/job', note)).toEqual({
      kind: 'article',
      id: 'tw/bible/names/job',
    });
    expect(resolveLink('rc://*/ta/man/translate/figs-metaphor', note)).toEqual({
      kind: 'article',
      id: 'ta/translate/figs-metaphor',
    });
  });

  it('resolves resource container links to passages, whatever the text they name', () => {
    expect(resolveLink('rc://*/ult/book/rut/01/16', note)).toEqual({
      kind: 'passage',
      reference: 'RUT 1:16',
    });
    expect(resolveLink('rc://en/tn/help/3jn/01/03', note)).toEqual({ kind: 'passage', reference: '3JN 1:3' });
    expect(resolveLink('rc://*/ult/book/rut/02', note)).toEqual({ kind: 'passage', reference: 'RUT 2' });
  });

  it('resolves relative links against the file they are written in', () => {
    expect(resolveLink('../kt/god.md', word)).toEqual({ kind: 'article', id: 'tw/bible/kt/god' });
    expect(resolveLink('../names/job.md', word)).toEqual({ kind: 'article', id: 'tw/bible/names/job' });
    expect(resolveLink('../figs-idiom/01.md', academy)).toEqual({
      kind: 'article',
      id: 'ta/translate/figs-idiom',
    });
    expect(resolveLink('../../checking/acceptable/01.md', academy)).toEqual({
      kind: 'article',
      id: 'ta/checking/acceptable',
    });
    expect(resolveLink('../rut/01/16.md', word)).toEqual({ kind: 'passage', reference: 'RUT 1:16' });
    expect(resolveLink('../rut/01/16.md', note)).toEqual({ kind: 'passage', reference: 'RUT 1:16' });
  });

  it('leaves unknown, external and out-of-range links unresolved', () => {
    expect(resolveLink('https://example.org/page', word)).toBeUndefined();
    expect(resolveLink('mailto:someone@example.org', word)).toBeUndefined();
    expect(resolveLink('rc://*/obs/book/obs/01/01', note)).toBeUndefined();
    expect(resolveLink('rc://*/ult/book/rut/09/01', note)).toBeUndefined();
    expect(resolveLink('rc://*/ta/man/translate', note)).toBeUndefined();
    expect(resolveLink('#definition', word)).toBeUndefined();
    expect(resolveLink('../kt/', word)).toBeUndefined();
    expect(resolveLink('notes.txt', academy)).toBeUndefined();
  });
});
