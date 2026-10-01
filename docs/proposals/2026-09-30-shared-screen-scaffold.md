# One screen scaffold, header and text component

Approved in issue #37 (the issue is the approval), with the design-system fidelity items of issue #41 and the
script-face and direction items of issue #62 that land in the same shared files.

## Problem

Formation, Settings and About each carried a copy of the same screen scaffold (`parts/Screen.tsx`), text
component (`parts/Line.tsx`) and card (`parts/Card.tsx`); Formation and Settings also carried a row
(`parts/Row.tsx`) whose copies had already drifted (14 px against 18 px side padding). `src/shared/ui` had its
own scaffold, header and text component (`ScreenScaffold`, `Header`, `ThemedText`) used by the other features.
The two headers disagreed on the title of a screen with a back control: the shared `Header` set it at the
hero size (28 px) and the feature copies at the card-title size (19 px). The prototype sets neither: a
sub-screen title is 24 px medium with the hero tracking (Library, Languages, Transfer, Settings), 900 in
Nunito Sans on a brand page (About), and a centred detail title is 17 px semibold (Session, Article). A fix to
one copy (the script-font fix of issue #35, the tracker's row padding) had to be made three times.

## Change

- `src/shared/ui/ThemedText.tsx` is the one text component. It gains the `accent` tone, the brand weights of
  PRD 10.1 (900 for headings, 500 for the overline, 400 for the rest) for `family="brand"`, and `live` for a
  polite live region. The feature `Line` copies are deleted and their callers use `ThemedText`.
- `src/shared/ui/Header.tsx` is the one header. It gains `subtitle`, `centred` and `brand`, and picks the title
  size from the prototype: hero (28 px) with no back control, 24 px with one, 17 px semibold when centred. The
  three sizes that are not tokens (24, the detail title line height 1.2) are copied into
  `prototypeValues.header`.
- `src/shared/ui/Screen.tsx` is the titled screen: `ScreenScaffold` with a `Header`, taking the props the
  feature copies took. `ScreenScaffold` gains `intensity` for the aurora and an in-flow footer, so a sticky
  footer never covers the end of the scroll.
- The shared `Card` gains the level-1 form (soft blur, no shadow) the feature copies used, and the shared
  `SectionTitle` the `brand` form About used. The feature `Card` and `Screen` copies are deleted.
- Formation and Settings keep a feature `Row` only where it differs from the shared `Row` in purpose; the two
  copies become one shared `ListRow` in `src/shared/ui` with the 18 px card gutter.
- The back control's chevron follows the layout direction: `src/shared/glass/layoutDirection.ts` reads
  `I18nManager.isRTL` on a phone and `layoutDirection.web.ts` reads the document direction in the web render
  harness, and `Icon` mirrors its directional glyphs from it. On a phone `Icon` already mirrored through
  `I18nManager`; on the web `I18nManager.isRTL` is always false, so the shots showed the chevron unmirrored.
- Study's `Say` resolves its face through `uiText` and `uiFont`, and Study imports `contentText` and
  `directionOf` from `@shared/theme` directly; the re-export in `parts/script.ts` is deleted.

## Alternatives

- Keep the feature copies and fix each: the drift this issue reports is what that produces.
- Make the feature `Line` the shared text component and retire `ThemedText`: 149 `ThemedText` call sites
  would move instead of about 110 `Line` ones, and `ThemedText`'s prop names already match React Native's.
- Move Study's `Say` into `ThemedText` too: Study's tones and named weights are Study's own, and issue #62
  asks only that its face come from the script logic.

## Rules affected

Rule 4: `src/shared/ui`, `src/shared/glass` and `src/shared/theme` are shared roots; this proposal and issue
#37 are the approval. Rule 1 is served: a feature screen uses the shared scaffold instead of copying it. No
rule is broken, so no row is added to `docs/exceptions.md`.
