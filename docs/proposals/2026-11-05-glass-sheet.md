# A glass bottom sheet for the Study helps

Status: approved by the requirements owner on 2026-11-05 ("start working on all of these"; decisions delegated
to the agent). Issue #90. Supersedes the approach in #82 (hide or expand the helps pane by hand).

## Problem

The Study helps panel (Notes, Word links, Questions) is always on screen and can take half of it
(`helpsShare = '50%'`), and with nothing selected it falls back to the landing or first verse, so reading never
gets the full screen. There is no animated sheet in the codebase: `src/shared/ui/Sheet.tsx` is a static glass
surface, and the only slide-up is the book picker's `Modal`. A sheet is a shared primitive, so it belongs in
`src/shared/glass/`, a shared root (AGENTS.md rule 4).

## Change

- **`src/shared/glass/GlassSheet.tsx`**, a glass bottom sheet in the layout flow, so the content above it shrinks
  instead of hiding under it and whatever sits below it (the audio bar) stays visible:
  - `open`, `heights` (`peek` and `expanded`, in points), `onDismiss`;
  - a handle row: a grabber that drags the sheet, and a close button. Dragging follows the finger; on release
    the sheet settles at the nearest of closed, peek and expanded, projected by the release velocity over
    `--dur-fast`. Closed calls `onDismiss`. Tapping the grabber toggles peek and expanded;
  - motion: `--dur-base` with `--ease-damp` (the readme names `--ease-damp` for sheets); Reduce Motion moves it
    at once, with no slide;
  - accessibility: the grabber carries the sheet's accessible name (`accessibilityLabel`, required) as an
    adjustable element: increment expands, decrement collapses, escape dismisses, activate toggles; focus moves
    to it when the sheet opens; Android Back dismisses it; the close button has its own required name;
  - glass: `GlassSurface` level 3, heavy blur, radius `2xl` (the readme's sheet radius).
- **`src/shared/glass/accessibilityFocus.ts`** and **`accessibilityFocus.web.ts`** (2026-11-05, with #84): moving
  focus to the grabber goes through `moveAccessibilityFocus`, which calls `AccessibilityInfo.sendAccessibilityEvent`
  on iOS and Android. react-native-web has no such function, so the study passage rendered blank in the web
  harness; the web file does nothing, and a browser keeps its own focus order.
- **`src/shared/glass/sheet.ts`**: the pure geometry (`sheetHeights`, `detentHeight`, `dragHeight`,
  `settleDetent`), tested in Node.
- **Study**: no verse selected, no sheet, and the text fills the screen; tapping a verse opens the sheet at peek
  with that verse's helps; tapping another updates it in place; dismissing clears the selection. A request that
  names a verse (a search hit, a note link, a Home bookmark) selects it, so the sheet opens at peek on that verse;
  a request for a chapter opens with nothing selected.

## Alternatives

- `react-native-gesture-handler` and `@gorhom/bottom-sheet`: neither is a dependency today; two native-backed
  packages for one sheet is more than `Animated` and `PanResponder` need.
- An overlay sheet over the verse list (transform only, native driver): smoother on a slow phone, but the
  selected verse can sit under the sheet. The in-flow height animates on the JS thread; if it proves janky on a
  2 GB Android phone, the next step is the overlay with a bottom inset on the list.
- A collapsible pane with a manual toggle (#82): keeps the panel on screen when nothing is selected.

## Rules affected

- Rule 4: new files in `src/shared/glass/` and two new exports from its index. No existing primitive changes.
- Section 7: the design system has no sheet component and no tokens for a sheet's peek height, drag threshold or
  release projection. This uses existing values only and lists the design change needed: peek reuses the Study
  panel's existing half share (`helpsPeekShare = 0.5`), expanded is all the room between the header and the
  audio bar, the grabber is `--sp-13` by `--sp-2` in `--text-faint`, the drag starts after `--sp-3`, and a
  release is projected over `--dur-fast`. Claude Design should specify the sheet (heights, grabber, motion) and
  the code will follow it.
- Section 7, an open design question: because expanded is all the room, the verse list above has no height at
  the expanded detent, so the selected verse and the words "Show in the verse" highlights are visible only at
  peek. Claude Design should decide whether expanded leaves the selected verse visible, for example by stopping
  one verse row short of the room.
