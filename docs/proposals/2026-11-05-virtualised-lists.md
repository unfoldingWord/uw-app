# Virtualised long lists and a busy row

Status: approved by the requirements owner on 2026-11-05 ("start working on all of these"; decisions delegated to
the agent). Covers #85 and the `ListRow` part of #99.

## Problem

Training rendered every lesson of every manual at once, a few hundred `ListRow`s, inside the `ScrollView` of
`ScreenScaffold`. Each `ListRow` is a `GlassSurface` with its own blur view, shadows, refraction and press
animation, so the page scrolls slowly (#85). The language list (about 198 rows), the library and the book picker
also map whole arrays into a `ScrollView`. A virtualised list cannot sit inside the scaffold's `ScrollView`, and
the scaffold offered no other way to host one.

`ListRow` and `Row` received `busy` from `Tappable` and ignored it, so a pressed row showed no work in progress.

## Change

- `ScreenScaffold` and `Screen` take an optional `list` render function. When it is given, the scaffold renders
  it in place of its `ScrollView` and hands it the same content padding (as `props` to spread onto a `FlatList`
  or `SectionList`) and the stack gap (for an item separator). Without `list` nothing changes, so the keyboard
  work on `ScreenScaffold` in a parallel PR is unaffected.
- `src/shared/ui/Gap.tsx`: a fixed-height spacer for list separators.
- `src/shared/ui/BusyFade.tsx`: the breathe pulse `GlassButton` and `GlassIconButton` already use for `busy`
  (`theme.motion.keyframes.breathe`, `referenceValues.dotRing.breatheMs`, still under Reduce Motion), as a
  wrapper. `ListRow` and `Row` wrap their content in it with the `busy` that `Tappable` passes.
- Long lists render through `FlatList` or `SectionList` and use the flat `Row` (glass fill 1, soft glass border,
  no blur view), which is the row the prototype draws for search results and language rows
  (`UwResourcesApp.dc.html`, the rows with `background:var(--glass-fill-1);border:var(--border-glass-soft)` and no
  `backdrop-filter`). Short lists (the Training manuals, Formation tracks, Settings) keep the glass `ListRow`.

## Alternatives

- One glass surface behind the whole list: a single blur view, but the surface would have to scroll with the list
  or sit still behind moving rows, and the prototype has no such list. Not chosen.
- Remove the blur from `ListRow` itself: changes every short list the prototype draws as glass. Not chosen.
- Keep `.map` in the `ScrollView` and only drop the blur: the mounting cost of hundreds of rows stays. Not chosen.

## Rules affected

Rule 4 (changes in `src/shared/`), recorded here. No exception is needed: every value comes from the tokens,
`referenceValues` or `prototypeValues`. The book picker's grid column counts are layout, not tokens, and are
listed as a needed Claude Design pass in the PR, as is the Training table of contents layout (#87), which the
prototype does not draw.
