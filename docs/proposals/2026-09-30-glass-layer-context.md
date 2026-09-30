# A glass layer context that caps nested blur

Approved in issue #38 (the issue's fix is the decision).

## Problem

`GlassBlur` rendered a BlurView for every surface, chip, icon button, input and blurred button with no
nesting guard. A Library card put up to four blurred chips inside a blurred card, about five BlurViews per
card over fourteen cards. PRD 10.3 and `design-system/readme.md` say never stack more than two glass levels:
glass over aurora, never glass over glass. Each nested BlurView costs a render pass on a low-end Android
phone and adds no visible depth.

## Change

- `src/shared/glass/context.tsx` gains `GlassLayer` and `useInsideGlass()`. `GlassSurface` wraps its
  children in `GlassLayer`.
- `GlassBlur` asks the pure `blurRenders` (`src/shared/glass/blurLayers.ts`, tested) and renders nothing
  inside a glass layer, as it already did in reduced-blur mode, at zero intensity and on Android without a
  blur target. The element keeps its fill, hairline and shadow, so a chip in a card reads as the same chip.
- Nothing changes for glass that sits on the aurora: the header's icon buttons, the tab bar and every card
  keep their blur.
- The reduced-blur default (on below Android API 31) is unchanged. Setting it from evidence needs frame times
  measured on an Android 12 phone with 2 GB of RAM, which has not been done.

## Alternatives

- A `blur={false}` prop on every chip and icon button: each call site has to know what it sits in, and the
  next card that forgets brings the stack back.
- A depth counter that allows a second blurred level: the design rule is one blurred glass level over the
  aurora, so a counter would only encode the same boolean.

## Rules affected

Rule 4: `src/shared/glass` is a shared root. No rule is broken; the new context lives beside the existing
`ContentColor` and `BlurTarget` contexts.
