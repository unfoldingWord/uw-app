# Full-text index state, and a keyboard-aware screen scaffold

Status: approved by the requirements owner on 2026-11-05 ("start working on all of these"; decisions delegated to
the agent). Issues #98 and #95, and the Search parts of #99 (gap 3) and #85.
`src/shared/ui/` is a shared root (AGENTS.md rule 4), so this records what changed there and why. The Corpus
changes stay inside the module that owns the index (`src/lib/corpus/`); no event, port or kernel file changes. No
rule is broken, so there is no entry in `docs/exceptions.md`.

## Problem

- **#98.** Turning on "Search inside every text" did not reliably make Search find words inside the text. A failed
  build was journaled and then invisible; Settings read On from the wish, not from the built index; a language
  installed after the toggle was never indexed; every language was built serially in alphabetical order with no
  progress; and Search did not run the query again when the index finished.
- **#99, gap 3.** Search awaited a debounced search with nothing on screen saying it was searching.
- **#85, Search.** Search results were a `.map` inside a `ScrollView`, so every row mounted at once.
- **#95.** Nothing handled the keyboard. On a phone the keyboard covers the group notes field, and the dock (play,
  previous, next) and the floating footer sit over the field being typed in. Inferred, not observed on a phone:
  with Android edge to edge, `adjustResize` no longer lifts content, and iOS never does.

## Change

- **Corpus** (`src/lib/corpus/indexing.ts`, `corpus.ts`, `types.ts`, `fulltext.ts`):
  - `indexState(language)` returns `off`, `waiting`, `building` (with a percent of the estimated entries),
    `built`, or `failed` (with the failure code); `onIndex(listener)` is called on every change of it.
  - `setIndexesWanted(on, first)` wants or drops the index of every content language, `first` (the language being
    read) first. Turning on queues every language at once, so the others show `waiting`.
  - `reindex(language)` is the retry; it clears the failure.
  - While any language wants the index, a language whose indexed text arrives later is wanted too and built in the
    same reaction to `PackInstalled`. Turning it off drops every wanted language, including ones whose pack is
    gone, so a later language is not adopted after the leader turned it off.
- **Settings:** the toggle keeps the choice the leader made; under it, each language shows its real state, a
  progress bar while it builds, and a failed build with its code and Try again. The card follows `onIndex`.
- **Search:** the toggle row from the prototype (`UwResourcesApp.dc.html` 208 to 211) sits under the results with
  the storage cost, the build progress, or the failure with Try again. Search runs the current query again when
  the index for the language being read becomes built. A "Searching" caption shows while a search is debounced
  or awaited. Results render through a `SectionList` (Passages, Titles, Inside the text).
- **ScreenScaffold** (`src/shared/ui/ScreenScaffold.tsx`, new `useKeyboardInset.ts` and `keyboardInset.ts`):
  - listens to the keyboard frame (`keyboardWillChangeFrame` and `keyboardWillHide` on iOS, `keyboardDidShow` and
    `keyboardDidHide` on Android) and measures its own scroll frame in the window;
  - insets the scroll content by the part of the frame the keyboard covers (none when the system already lifted
    the screen);
  - scrolls the focused field (`TextInput.State.currentlyFocusedInput()`) until it clears the keyboard by `sp8`,
    never past the top of the frame;
  - hides the dock and the floating footer while the keyboard covers the frame.

  Every screen built on `ScreenScaffold` or `Screen` gets this, including the group notes and the group name. The
  pure parts (`keyboardOverlap`, `revealDistance`) have tests; the hook does not render in the sim.

## Alternatives

- **`react-native-keyboard-controller`** (MIT, has an Expo config plugin), as #95 suggested. It would give
  frame-accurate animation and a scroll view that follows the caret, but it is a native dependency. React Native's
  own `Keyboard` events and `measureInWindow` cover the three requirements with no new dependency. If the device
  run shows the hand-measured inset failing on Android edge to edge, this is the next step.
- **`KeyboardAvoidingView`.** It computes the same overlap, but it resizes the whole screen, which also moves the
  header and the dock, and it does not scroll the focused field into view.
- **A global wish row for full text** (a sentinel language, or a new table and migration). It would separate
  "never decided" from "turned off", but only the global toggle exists in the product, so "any language wants it"
  says the same thing with no schema change.
- **Toggle only in Settings.** Kept as well, but the prototype puts it on Search, where the leader notices it is
  missing.

## Rules affected

- Rule 4: `src/shared/ui/ScreenScaffold.tsx` and `src/shared/ui/index.ts` change, and two files are added beside
  them. The change is additive: the scaffold props are unchanged, and the scroll view now sits in a view that is
  measured.
- Rule 2: the keyboard frame is a rendering input with no port, on the same reasoning as the safe area and blur
  (`docs/architecture.md`, "The root layout"); the sim never renders and a memory adapter for it would do nothing.
- Rule 3: the wish for an index stays a Corpus fact in `corpus_index_wanted`, still written only by Corpus.
- Design: no token or prototype value is added. The Search toggle row reuses the quiet result row's tokens; the
  progress bar and notice are existing primitives.
