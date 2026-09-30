# Import a burrito file on the phone

Status: accepted in issue #6 (2026-09-30), as built; recorded in ADR 0009. architecture.md and AGENTS.md section 3 list the Picker port.

## Problem

SH-3 asks that the app import a burrito the leader opens from a file, through the same install path as a
download and a transfer (ADR 0005). The kernel already has that path (`packs.importFile(uri)` adopts a file
the system hands to the app, then `install(fromFile(path))`), and the sim proves it. On a phone nothing reaches
it: no screen can ask the system for a file, and the app is not offered when a leader opens a `.zip` in
another app (`docs/release-checklist.md`, SH-3 gap).

## Change

- A new port, **Picker**, with one call: `pickArchive(): Promise<{ uri } | undefined>`, where `undefined`
  means the leader closed the picker. The platform adapter (`src/platform/picker.ts`) opens the system
  document picker through `expo-document-picker` (MIT, Expo config plugin, no permission), for
  `application/zip` and `application/octet-stream`, copying the file into the cache so the Files port can
  adopt it. The memory adapter (`sim/adapters/picker.ts`) answers from a script: a file, a cancel, or a port
  failure. Both adapters land in the same change (rule 1). `compose.ts` hands the port to modules unchanged.
- Packs gains `importPicked()`: ask the Picker, then `importFile(uri)`. A cancel returns `undefined` and
  journals nothing; a failed pick is a `Failure` event with the port's code, step `file`.
- The Languages service gains `importFile()` (pick and install) and `importOpened(uri)` (install a file
  another app opened the app with), both returning an outcome the screen shows in place.
- Opening a `.zip` from another app: `app.config.ts` registers `CFBundleDocumentTypes` for
  `public.zip-archive` on iOS (the system copies the file into the app's inbox and opens a `file://` URL)
  and a `VIEW` intent filter for `application/zip` and `application/octet-stream` over `content` only (a `file` URI would need storage permission)
  on Android. `app/+native-intent.ts` re-exports `redirectSystemPath` from the Languages feature, which turns a
  `file://` or `content://` URL into `/languages?opened=<uri>`; every other path passes through. The Languages
  modal then asks before installing. No permission is added; `READ_EXTERNAL_STORAGE` stays blocked because a
  `content://` grant needs none.

## Alternatives

- Extend the Files port with a pick call: Files is storage under a root; a picker is a system dialog with a
  cancel, and mixing them would make the Files contract case interactive.
- Handle the URL with `Linking.useURL` in `app/_layout.tsx`: Expo Router consumes the same URL first and
  would open its not-found screen for a `file://` path; `+native-intent` is Expo Router's own hook for
  rewriting system paths, and it keeps the root layout unchanged.
- Android `SEND` (share to the app): React Native's `Linking` reads only the intent's data, not
  `EXTRA_STREAM`, so a share would open the app on nothing. It needs a native module outside Expo, which
  AGENTS.md section 3 puts behind its own proposal.

## Rules affected

Rule 1 (a new port with both adapters in the same change: done), rule 4 (`src/lib/ports.ts`,
`src/lib/compose.ts`, `src/platform/ports.ts` and `app.config.ts` are shared roots; `app/+native-intent.ts` is
a new file at the root of `app/` that is not a route). Recorded in `docs/exceptions.md` until the scaffold PR
merges or this proposal is refused. If accepted, `docs/architecture.md` and AGENTS.md section 3 list the
Picker port.
