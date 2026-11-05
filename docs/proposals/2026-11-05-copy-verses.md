# Copy verses to the clipboard

Status: approved by the requirements owner on 2026-11-05 ("There's another batch of issues up there on GitHub that
need to be addressed"; decisions delegated to the agent). Under that delegation the agent installed `expo-clipboard`,
chose "before, short book name" as the default reference format, and kept the attribution line on copied text
(SH-5). Issue #84.

## Problem

A reader cannot take Scripture out of the app except through Share (SH-4), which sends a whole passage reference
to another app. Issue #84 asks to select one verse or a range, copy the text to the clipboard, and choose how the
reference is included: before or after the text, the short or the full book name, or none. The clipboard is a
device API, so by AGENTS.md section 3 it needs a port, which is a shared root (rule 4).

## Change

- **Dependency:** `expo-clipboard`, added with `npx expo install expo-clipboard` so its version matches the Expo
  SDK. It replaces the deprecated `Clipboard` in React Native core. MIT, an Expo module with no config plugin needed,
  no network, and no Android permission (its manifest adds only a non-exported file provider).
- **Port:** `Clipboard` in `src/lib/ports.ts`, `{ copy(text: string): Promise<void> }`, added to `Ports`. Platform
  adapter `src/platform/clipboard.ts` over `Clipboard.setStringAsync`; memory adapter `sim/adapters/clipboard.ts`
  that keeps the last text so a scenario can read it; the web harness passes the memory adapter through
  `@sim/web/ports` as the other ports do; contract cases in `sim/adapters/contract.ts` run against both.
- **Events:** `VersesCopied` in `lib/domain/events.ts` with the reference and language only, never the text, and a
  failure event with a code when the write is refused, so a failed copy shows in place on the control.
- **Preference:** `study.copyReference` in the `preferences` module's schema (rule 1, ADR 0007), one of
  `before-short`, `before-full`, `after-short`, `after-full` and `none`, default `before-short` (the reference first, with the short book name).
- **Kernel or service:** a pure formatter (`copyText(passage, range, format)`) beside the study service, tested at
  that interface, and `service.copy(range)` that writes through the port and journals the event.
- **Screen:** a verse tap selects it and opens the helps sheet as today. A long press on a second verse extends the
  selection to a range from the first; a plain tap on another verse starts a new selection. The sheet's action row
  gets "Copy" next to save and share, and a small chooser for the reference format that remembers the choice.
- **Scenario first:** `SH-4.copy-verses-with-reference.ts`, observed red, then the code.

## Alternatives

- React Native core `Clipboard`: deprecated and printed as removed in a future release; refused.
- `@react-native-clipboard/clipboard`: maintained, but a native module without an Expo config plugin, which
  AGENTS.md section 3 makes an architecture change; `expo-clipboard` does the same job inside Expo.
- Text selection inside a verse row (`selectable` is already on): copies raw text with no reference and no range
  across rows, so it does not meet the issue.
- Copy through Share only: the share sheet offers "Copy" on both platforms, but without the reference choice and
  only for the whole passage.

## Rules affected

- Rule 4: `src/lib/ports.ts`, `src/lib/domain/events.ts`, the preferences schema, `src/platform/` and the web
  harness.
- Rule 3: the preference key is written by the `preferences` module only.
- Section 6: one new dependency, recorded in the PR.
- SH-5: copied text carries the licence and attribution line, one line after the text, as every shared item does.
- PRD: copying is not a numbered requirement today; it fits SH-4 (share a passage) and should be added as a
  sentence there or as a Should row in section 7.6 when this is accepted.
