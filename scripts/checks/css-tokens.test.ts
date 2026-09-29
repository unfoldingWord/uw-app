import { describe, expect, it } from 'vitest';
import { compareRecords, parseTokenCss } from './css-tokens.ts';

const light = `:root{
  /* a note */
  --a:1px; --b:var(--a);
  --gradient:
    radial-gradient(50% 50% at 10% 10%,rgba(1,2,3,.5) 0%,rgba(1,2,3,0) 70%),
    linear-gradient(180deg,#FFF 0%,#000 100%); /* @kind other */
  --dur:600ms /* @kind other */;
}
@keyframes spin{from{opacity:0}to{opacity:1}}
@media (prefers-reduced-motion:reduce){:root{--dur:1ms}}
@font-face{font-family:'Face';src:url("../assets/fonts/Face-Regular.ttf") format("truetype");font-weight:400;font-style:normal}
input::placeholder{color:var(--a)}`;

const dark = `[data-theme="dark"]{ --a:2px; }`;

describe('parseTokenCss', () => {
  const parsed = parseTokenCss([light, dark]);

  it('reads custom properties from :root with comments removed and whitespace collapsed', () => {
    expect(parsed.root).toEqual({
      '--a': '1px',
      '--b': 'var(--a)',
      '--gradient':
        'radial-gradient(50% 50% at 10% 10%,rgba(1,2,3,.5) 0%,rgba(1,2,3,0) 70%), linear-gradient(180deg,#FFF 0%,#000 100%)',
      '--dur': '600ms',
    });
  });

  it('reads the dark scope, the reduced-motion scope, keyframes and font faces separately', () => {
    expect(parsed.dark).toEqual({ '--a': '2px' });
    expect(parsed.reducedMotion).toEqual({ '--dur': '1ms' });
    expect(parsed.keyframes).toEqual({ spin: 'from{opacity:0}to{opacity:1}' });
    expect(parsed.fontFaces).toEqual([
      {
        family: 'Face',
        file: 'Face-Regular.ttf',
        weight: '400',
        style: 'normal',
        stretch: undefined,
        unicodeRange: undefined,
      },
    ]);
  });

  it('refuses a token declared twice with different values', () => {
    expect(() => parseTokenCss([':root{--a:1px}', ':root{--a:2px}'])).toThrow(/declared twice/);
  });
});

describe('compareRecords', () => {
  it('lists missing, extra and mismatched names', () => {
    expect(compareRecords({ a: '1', b: '2' }, { b: '3', c: '4' })).toEqual({
      missing: ['a'],
      extra: ['c'],
      mismatched: ["b: tokens say '2', theme says '3'"],
    });
  });
});
