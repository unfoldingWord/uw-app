# Progress tracker

What actually ran, append-only, newest first. Each entry says what was run, what was observed, and what was
not verified.

## 2026-09-29 F3 real Door43 releases: the shapes read in CI run 36618141715

Source of every fact: GitHub Actions run 36618141715 (job 109576350275), whose `CONTRACT_DESCRIBE` output paged
the whole production `tc-ready` catalog and opened 17 real `sb` archives. This sandbox cannot reach
git.door43.org (HTTP 403 through the proxy), so nothing below touched real data here; everything ran in Node on
fixtures and on test burritos copied from the captured shapes.

- Red first, each observed before the fix:

| Test | Red |
|---|---|
| `src/lib/burrito/dcs.test.ts` (go-rc2sb v0.5.0 shapes) | 9 of 11 failed: en_ult `invalid` (USFM as `text/plain`), en_tw and mr_tW `expected 'wordLinks' to be 'articles'`, en_obs-sq and en_obs-tn `ignored`, en_obs-twl `expected 'wordLinks' to be 'storyHelps'`, provenance with the commit in `tag`, licence not taken from LICENSE.md, formation flavor still `parascriptural/x-obsMovements` |
| `sim/corpus-dcs.test.ts` (Corpus over those shapes) | 3 of 3 failed: `expected [ [ 'NEH', 'RUT' ] ] to deeply equal [ [ 'RUT' ] ]` (stub book listed), `expected undefined to be 'God'` (payload/ article ids), story helps missing |
| `src/lib/corpus/readings.test.ts` (catalog Bible codes) | 4 failed: ar_arst, ar_nav, en_t4t read as literal; "Texto Puente Simple" read as literal |
| `sim/packs.test.ts` peer swap, after offers began carrying the release | `expected { ok: true ... } to match object { ok: false }`; fixed by carrying the commit in the offer |
| `DX-3` after file imports lost their tag | the replayed file install became `http.status` for `sb/unrecorded.zip`; fixed by recovering the release from the catalog by commit |

- Mismatches fixed: M1 (USFM `text/plain`, told by `.usfm`), M2 (Words are `x-bcvarticles` from a `tw`
  repository), M3 (`payload/kt/god.md` is `tw/bible/kt/god`), M4 (relative `./payload/...` TWLinks), M5 to M7
  (`x-obsnotes`, `x-obsquestions`, `obs-twl` scoped `{OBS: []}`), M8 to M10 (revision is the commit; tag and
  `released` come from the catalog, the peer offer, or the catalog release matching a file's commit; the
  generation timestamp is no longer a release date), M11 (statement `mimetype` and `lang` optional; the shown
  licence adds CC BY-SA 4.0 from LICENSE.md when the statement names none), M15 (tests pinning the captured USFM
  heads), M16 (formation row renamed to the catalog flavor, still provisional), M17 (audio recorded as release
  assets, an open question in the proposal, nothing built), M18 (codes pinned), M21 (contract rewritten), M22
  (fixture `hbo_uhb` retagged v3.0.0 and `en_obs-tf` v4 to match the catalog; the old v2.1.30 and v1 archives are
  deleted because their tags left the fixture catalog).
- Not fixed: M12 (the two unseen extra OBS content files; no story body was captured), M13 (TA matched the
  existing row only by reading; now in the live samples), M19 (the 16 `ts` OBS repositories, unsampled), M20
  (the non-TSV `peripheral/x-OBSTranslationQuestions`, still ignored), and the `sourceUrlOf` link for a file whose
  tag is `unrecorded`, which points at `releases/tag/unrecorded`; changing it is a change to `src/lib/domain/`
  and needs a proposal.
- USFM (M15): the parser already read every captured head (chunk markers, braces around implied words, nested
  `\zaln-s`, unprefixed `lemma` and `strong`, `c:H3315`, word joiners, `\cl`, `\mt2`, front matter, a stub book);
  the new tests passed on their first run and pin that. The stub book is dropped at ingest: a USFM ingredient of
  64 KB or less with no `\v` is not listed as a book (a bounded read, so the streaming install test still holds).
- Literal and simplified (M18): pinned from codes, labelled inference because the capture has no titles for
  these: `avd` (Van Dyck) and `bsb` (Berean Standard) literal; `nav` (New Arabic Version), `arst` (by the `st`
  suffix, as in `gst` and `ust`) and `t4t` (Translation for Translators) simplified; `tpl` literal from the
  es-419 burrito's own abbreviation, observed.
- A title note at `1:0` in obs-tn is kept as frame 0 (the story title).
- Fixtures rebuilt with `npm run fixtures` (21 burritos, 208 KB): go-rc2sb metadata, `text/plain` USFM with
  `FRT.usfm` and a stub `NEH.usfm`, original-language `\w` with `lemma` and `strong`, Words and Word Links with a
  `payload/` tree and relative links, story helps as `OBS.tsv` (new `qaa_obs-twl` with `rc://` links), bare
  statements on stories, catalog entries with every observed key, pages served with `x-total-count` and `Link`.
  Scenario counts moved from 11 to 12 resources in `qaa` and 20 to 21 releases for the new fixture.
- Live check (`npm run contract`): now pages the whole catalog, samples one release per row and form (en_ult,
  en_ust, hbo_uhb, ugnt, es-419 glt and gst with their readings, en_tn, en_twl, en_tq, en_tw, en_ta, en_obs,
  sw_obs, en_obs-tn, -sq, -tq, -twl; en_obs-tf reported as a gap), and in CI installs nine real English releases
  through the kernel on memory adapters and reads TIT 1:1, story 1 and `tw/bible/kt/god`. `CONTRACT_DESCRIBE=1`
  no longer prints the 322 catalog items; `full` does. Offline here it printed
  `live: skipped, offline (HTTP 403 ...)`.
- Not verified: anything against real data (the next CI run is the check); the ingest smoke end to end, which
  cannot run here; that a catalog `commit_sha` always equals the burrito's `revision` (inference: both come from
  the tag's commit; catalog installs do not depend on it, peer and file imports do).
## 2026-09-29 U1 Transfer, Share and diagnostics screens, and pictures from the device

Node v22.22.2. Everything below ran in Node through ESLint, TypeScript, Vitest, the checks, the sim and the
Metro bundle for Android and iOS. No screen was rendered: nothing ran on a phone, a simulator or a browser.

- Routes: `/transfer` (modal), `/share` (modal) and `/diagnostics`, each a one-line re-export of
  `src/features/{transfer,share,diagnostics}/screens/*Screen.tsx`, registered in the root `Stack`. Formation's
  story session gains a Share action that opens `/share?kind=story&number=<n>`.
- Transfer screen: send or receive; on send, the language's resources with sizes (all chosen at first), the
  app package on Android with its size or the iPhone reason, the selection summary, the pairing code and
  progress, then sent or failed in place with Try again. On receive: looking for nearby phones, peers with
  their codes, the offer with a subset choice, progress, ready to read with Open (sets the content language
  and goes to Study), and the app package's ready-to-install state. When `capabilities().available` is
  false, which is what a phone shows today (`src/platform/transport.ts` stops at the seam), the screen shows
  `failure.transfer.unavailable` and the transfer note and nothing else.
- Share screen: share as text, share as audio when the passage has audio (otherwise the no-audio line), the
  attribution note (SH-5), a failure in place under the control that failed, and a dismissed share leaves
  the sheet open. Diagnostics: one sentence of what the file holds and the share action.
- Media addresses: `Files.uriOf(path)` on the port, both adapters and a port contract case; a `media`
  kernel module answers only under `packs/` and `partners/images/`. Services expose `study.picture(frame)`,
  `formation.picture(frame)`, `ImpactStoryView.image` and the Home invitation `image`; the Formation frame
  card, the Study story reader, the About and impact story wells and the Home invitation render the picture
  under the protection gradient, and keep the Ocean well when there is none. Proposal
  `docs/proposals/2026-09-29-media-addresses.md`, exception recorded.
- New check `routes` (`scripts/checks/routes.check.ts`, logic in `routes.ts`, tests in `routes.test.ts`).
- New strings `study.frame.picture` and `transfer.app.ready` in all 16 locales, listed in
  `docs/strings-review.md`.

### Observed red, then green

| Test | Red | Green |
|---|---|---|
| `npm run checks` with the routes check, before the three routes | `FAIL routes`: `LanguagesScreen.tsx navigates to /transfer`, `SettingsScreen.tsx navigates to /diagnostics`, `study/screens/parts/routes.ts navigates to /share`, each `which no route file under app/ serves` | `pass routes: 19 routes, each a re-export of a feature screen; 34 navigation targets, each served` |
| Same, with a throwaway `app/throwaway.tsx` re-exporting `@features/ghost/screens/GhostScreen` | `app/throwaway.tsx re-exports src/features/ghost/screens/GhostScreen.tsx, which has no default export` | throwaway removed |
| Port contract with the memory `uriOf` answering for any path (throwaway) | `a directory has no address: expected undefined, got "memory://device/contract/3/pictures"` | 18 passed |
| PA-6 and `sim/media.test.ts` with `media.uriOf` answering nothing (throwaway) | `FAIL PA-6.impact-stories`; `Tests 1 failed / 1 passed` | pass |

`npm run verify` exit 0: `Test Files 54 passed`, `Tests 590 passed`; typecheck pass on the three projects;
`6 checks, 0 pending, none failed` (strings: 425 keys in 16 locales); `sim: 52 scenarios, 52 passed, 0 failed`;
`trace: 51 Must requirements, 50 with a scenario, 1 proven by a test on the documented list, 0 unproven`;
`contract: 20 fixture burritos, 0 failed` (live skipped offline); `bundle android: pass` (1905 modules),
`bundle ios: pass` (1771 modules).

### Not verified

- No screen was rendered: light, dark, reduced blur, 360 px width, dynamic type at the maximum, RTL and
  screen reader labels are unverified beyond the code.
- The transfer flows beyond the unavailable state never ran on a phone: no radio exists. They are wired to
  the service calls the sim proves (SH-1, SH-2), but the screen itself was not driven.
- `File(...).uri` from expo-file-system rendering in `Image` on iOS and Android, and the picture crop.
- Pushing `/transfer` as a modal over the Languages modal, and `router.navigate('/study')` from it
  returning to the tabs, are inferences about Expo Router's native stack.
- Installing a received app package: the screen shows the ready-to-install state and stops there.
- The two new translations by a native speaker.

## 2026-09-29 M8 merge of the F2 fixes onto T8, T7b, M7 and the screens (T10 to T12)

Node v22.22.2. Everything below ran in Node through Vitest, the sim, the checks and the Metro bundle;
nothing ran on a phone and no screen was rendered.

- `git merge --no-ff f2-fixes` (F2 based on `de96dd2`) conflicted only in this file: both sides kept,
  main's entries above F2's.
- Red after the merge, fixed in the merge commit: typecheck, `src/lib/catalog/resourceTypes.ts` imported
  `resourceCode` and `simplifiedTextCodes` from `corpus/layout`, which F2 moved; it now asks
  `readingOfText` in `src/lib/corpus/readings.ts`, so the catalog and Corpus name a text reading the same
  way. `src/lib/share/payload.test.ts` lacked the new `PassageText.titles`. SH-3 failed on
  `packs/language/qab/id-000002/` against `id-000001/`: its last assertion compared whole paths, which now
  hold an install id; SH-3 now compares the files under each burrito's `root`.
- Transfer: the receiving peer session answers `{ ok: true, path }` with the staging file under
  `transfer/incoming/` instead of the archive's bytes. New test in `sim/transfer.test.ts`, observed red on
  the old receiver: `AssertionError: expected false to be true`.
- Settings: `fullText()` reads `corpus.indexWanted` (on when every installed language wants the index),
  and `setFullText(false)` calls `corpus.dropIndex`. The `settings.fullText` preference key is removed
  from `src/lib/domain/preferences.ts` so the wish has one writer (Corpus); CONTEXT.md's Preference entry
  says so. SE-1 extended (the wish survives a restart, off drops the index with `IndexDropped`), observed
  red first: `turning it off drops the index and gives the space back`, `true !== false`.
- The Hermes plural rules polyfill (`src/platform/intl.ts`, its import in `app/_layout.tsx`,
  `tests/intl-polyfill.test.ts` and the three `@formatjs` packages) is removed. Grepped `app`, `src`,
  `sim`, `scripts` and `tests` for `PluralRules` and `@platform/intl`: only `scripts/checks/plural.test.ts`
  uses `Intl.PluralRules`, in Node, as the reference. `docs/dependencies.md` records the removal.
- Study: a chapter's title (`PassageText.titles`) shows above its first verse in `VerseList`.
- `npm install`, then `rm -rf node_modules && npm ci`, then `npm run verify` green: 52 test files, 583
  tests; 5 checks pass (owns: 13 owners, 27 tables; strings: 423 keys in 16 locales); sim 52 of 52; trace
  51 Must requirements, 50 with a scenario, 1 (SE-2) by a test on the documented list, 0 unproven,
  enforced; contract 20 fixture burritos, live skipped offline; bundle android and ios pass.
- Not verified: the chapter title row rendered anywhere; `Intl.NumberFormat` and `Intl.DateTimeFormat` on
  Hermes without the removed polyfills (inference: Hermes ships both, and the removed `intl-locale` was
  only for the plural rules matcher); a transfer received into a real file system. The `study` flag on
  notes and questions is not shown on the Study screen: telling a study note from a translation note would
  need a new string in 16 locales, left for the polish task. A journal recorded before this merge that
  holds `PreferenceChanged` for `settings.fullText` no longer validates (inference; no such journal has
  left a device).

## 2026-09-29 M7b Transfer, Share and diagnostics services, DX-4 and trace enforced

Node v22.22.2. Everything below ran in Node through Vitest, the sim and the checks; nothing ran on a phone,
no radio was used, and no screen exists for these services yet.

- Added `src/features/transfer`, `src/features/share` and `src/features/diagnostics` on the T8 pattern
  (`createXService(kernel)`, words from the feature's `strings.ts`). The receiving side of Transfer is one
  `kernel.packs.install(fromPeer(session))` inside `accept`. Share reads the passage or story through Corpus in
  the content language and hands it to `kernel.share` with the app language. Diagnostics shares
  `kernel.journal.export()` and `kernel.snapshot()` through `kernel.share.journal`. Settings gains a
  `diagnostics` entry.
- New strings `transfer.code`, `transfer.code.hint`, `transfer.nothing`, drafted in all 16 locales and listed
  in `docs/strings-review.md`.
- Feature-service coverage added to SH-1, SH-2, SH-4 and DX-2 (sim helper `transferThroughServices` in
  `sim/transfer.ts`). Observed red with throwaway edits, each reverted:

| Throwaway edit | Red |
|---|---|
| Transfer service installs from a peer session that offers nothing | `FAIL SH-1 ... the result is ready to read` |
| Share service passes `locale: 'en'` for a passage | `FAIL SH-4 ... the app language is used` |
| Diagnostics view body reads `settings.diagnostics.about` | `FAIL DX-2 ... Expected values to be strictly deep-equal` |
| `sim/scenarios/SH-5...ts` moved out of the directory | `npm run trace`: `FAIL no scenario (DX-4): SH-5`, exit 1; `FAIL DX-4 ... every Must requirement has a scenario` |

- The trace functions moved from `scripts/trace/trace.ts` to `sim/trace.ts` (with `traceRepository`) so the
  DX-4 scenario can run them; the sim may not import `scripts/`. `npm run trace` now passes `--enforce`.
  SE-2 is accepted on its type-level test through `testProvenRequirements`, recorded in `docs/exceptions.md`.
- `npm run verify` green: 48 test files, 482 tests; 5 checks pass (strings: 417 keys in 16 locales); sim 52 of
  52; trace: 51 Must requirements, 50 with a scenario, 1 (SE-2) proven by a test on the documented list,
  0 unproven, enforced; contract 20 fixture burritos, live skipped offline; bundle android and ios pass.
- Not verified: any screen over these services; a real radio; installing a received app package on
  Android (the service reports the file ready to install and stops there); dynamic type and contrast for
  SE-2; the new translations by a native speaker. `sizeIn` is now copied in four feature `strings.ts` files
  because features may not import each other and `src/shared/` needs a proposal.

## 2026-09-29 M7 merge of Transfer and Share (T7b) onto Formation, the platform adapters and T8

Node v22.22.2. Everything below ran in Node through Vitest, the sim and the checks; nothing ran on a phone
and no screen was rendered.

- `git merge --no-ff t7b-transfer` conflicted in this file (both entries kept, T7b above T8),
  `docs/exceptions.md` (the kernel row lists every module; all eight slots are filled and nothing is pending),
  `docs/strings-review.md` (both notes kept), `sim/kernel.test.ts` and `src/lib/kernel.ts` (every module:
  preferences, bookmarks and partners from T8, then transfer and share), and `src/lib/domain/events.ts`
  (main's `GroupActivated`, `PositionChanged` and `LessonCompleted` rows kept; T7b's wider Transfer rows
  replace the narrow ones; replay classes unchanged: every Transfer row stays `verbatim`).
- Auto-merged and read: `sim/replay.ts` (T7b's `mintedIds` counts only ids that a `redo` or `follows` event
  carries; T8 did not change it), `src/lib/telemetry/folds.ts` (T7b's `transfersByPlatformPair`).
- Red after the merge: typecheck, `src/features/settings/service.ts(239,68): error TS2554`, because the new
  fold had no `privacy.count.transfersByPlatformPair` string. The key is drafted in all 16 locales and listed
  in `docs/strings-review.md`; the privacy screen lists the new fold, and SE-1 now compares the privacy counts
  with `Object.keys(emptyTelemetry)` so a fold added later cannot leave the device unlisted.
- `npm run verify` green: 48 test files, 480 tests; 5 checks pass (strings: 414 keys in 16 locales); sim 51
  of 51; trace reports SE-2 and DX-4 without a scenario (reporting only); contract 20 fixture burritos, live
  skipped offline; bundle android and ios pass.
- Not verified: the new translation by a native speaker. PRD section 9's analytics row names the seven
  counts; the per-platform-pair count comes from its success-metrics table, and the analytics row should
  name it too (a product edit, not made here).

## 2026-09-29 T7b Transfer and Share

Node v22.22.2. Everything below ran in Node through Vitest, the sim and the checks; nothing ran on a phone,
no radio was used, and no screen was rendered.
## 2026-09-29 T12 Formation, About, Licence, Privacy and Settings screens

Node v22.22.2. The screens were typechecked, linted, scanned by the strings check and bundled for Android
and iOS through Metro; none was rendered, on a phone or through react-native-web.
## 2026-09-29 T10 Onboarding, Home, Languages and the shared screen pieces

Node v22.22.2. Everything below ran in Node through ESLint, TypeScript, Vitest, the checks, the sim and the
Metro bundle for Android and iOS. No screen was rendered: nothing ran on a phone, a simulator or a browser.
## 2026-09-29 T11 Study screens

Node v22.22.2. Everything below ran in Node through Vitest, the checks, the sim and the Metro bundle; no
screen was rendered, on a phone or in a browser.

### Observed red, then green

| Test | Red | Green |
|---|---|---|
| SH-1, SH-2, SH-3 (transfer part), SH-4, SH-5, DX-2, DX-3 (transfer and share part), written before the modules were in `kernelModules` | `sim: 25 scenarios, 18 passed, 7 failed`: `Cannot read properties of undefined (reading 'offer')`, `(reading 'capabilities')`, `(reading 'passage')` | pass |
| SH-1 against the first draft | `the omitted simplified text did not travel`: `availableTexts` is `[]` when one reading exists (ST-3), not `['literal']`; then `nothing of the transfer is left`, which counted the empty `transfer/` directory | assertions corrected; pass |
| `moves a pack in many small chunks` in `sim/transfer.test.ts`, 600-byte link | timed out: the offer frame was larger than the link allows, the send failed, and the sender waited to drain a link it had not closed | messages over the limit travel as `part` frames; a failed side closes before it drains; pass |
| DX-3 with `mintedIds` counting ids from `verbatim` events again (throwaway edit) | `a transfer and a share replay event for event`: divergence at index 5, the redone install took the transfer's id | pass after revert |
| `refuses an archive whose digest does not match` with the md5 comparison removed from `src/lib/transfer/receiver.ts` (throwaway edit) | `1 failed` | pass after revert |

`npm run verify` exit 0: `Test Files 39 passed`, `Tests 422 passed`; `owns: 9 owners, 16 tables, 10 created
by migrations, one writer each`; `strings: 407 keys in 16 locales`, each complete; `5 checks, 0 pending, none
failed`; `sim: 25 scenarios, 25 passed, 0 failed`; `trace: 51 Must requirements, 25 with a scenario, 1 with a
test only, 25 unproven`; `contract: 20 fixture burritos, 0 failed` (live skipped, offline); `bundle: skipped`.

### What later tasks must follow

- The receiving half is two calls: `transfer.accept(selection)` returns a peer session once every archive is
  in `transfer/incoming/` and its md5 matches, then `packs.install(fromPeer(session))`. The feature service
  makes both calls; Transfer cleans `transfer/incoming/` when it observes that install end.
- `transfersCompleted` now counts the receiving side only, so a transfer is counted once across two phones,
  and `transfersByPlatformPair` splits the same count by `ios`/`android` pair (PRD 14). The privacy screen
  copy (`privacy.count.transfersCompleted`) does not mention the split; product should confirm it.
- The share link is one constant, `getTheAppLink = 'https://unfoldingword.org'` in
  `src/lib/share/payload.ts`, until the short link domain is chosen (PRD 15, open).
- The sim world's bus carries at most 4 KiB per chunk (`worldChunkBytes`), so every scenario transfer is
  chunked; `createWorld({ maxChunkBytes })` sets another size.
- The sim's Android devices report `app/unfoldingword.apk` (96 KiB) as the app package; a scenario writes the
  bytes there before offering it.

### Not verified

- No radio: the Transport platform adapter is still the open proposal, so throughput, message framing on a
  real stream, back pressure and link timeouts are unproven. `TransportLink.receive` has no timeout; a peer
  that stalls without closing holds a transfer until the leader cancels.
- The Android app package is saved to `transfer/app/unfoldingword.apk` with state `ready-to-install`;
  handing it to the package installer is an OS intent outside the kernel, not written or tried.
- A replay of a journal that received the app package shows no `receivedApp`, since the file is not in the
  journal (named in `docs/replay.md`).
- The archive the sender writes is proven to validate against the fixture rows only; no real go-rc2sb
  release was re-zipped, since git.door43.org is blocked here.
- `docs/content-contract.md` says the app writes a burrito for a share of a passage; Share sends text and
  audio files, not burritos (SH-4). The sentence needs a product decision, not a code change.
| `npm run checks` with the first screens | `FAIL strings ... SessionScreen.tsx has the literal "common.busy"` and every other key passed to `words.t`: the prose scan read string keys as copy | `pass strings ... 102 screen and shared files hold no literal copy` after `isStringKey` in `scripts/checks/strings-literals.ts` (test: `reads the key handed to words.t or words.plural as a key, not as copy`) |
| `npm run checks` with `setEnglishFailure('http.offline')` in a screen | `FAIL strings ... has the literal "http.offline"` | the offline code comes from the service's `download` outcome instead; FO-5 asserts it |

### Decisions

- Screens reach only their own feature's `service.ts`. Formation gains `languageName` and `download(pack)`
  (the one-tap English pack, FO-5); About gains `story(slug)` and `openStory(slug)` (PA-6, counts
  `ImpactStoryOpened`). Asserted in FO-5 and PA-6.
- External links (Give, the three About links, the full impact story) open through `router.push(url)`,
  which Expo Router hands to the system browser.
- Story pictures and impact-story images render as a calm Ocean well: `Frame.image.path` and the cached
  impact image are paths under the Files port root, and no port or kernel fact turns a path into a
  renderable URI. A remote image URL is not loaded, since that would be a network call outside the Http port.
- The Settings diagnostics row navigates to `/diagnostics`, which no route serves on this branch.

`npm run verify` exit 0: `Test Files 45 passed`, `Tests 460 passed`; `5 checks, 0 pending, none failed`;
`sim: 46 scenarios, 46 passed, 0 failed`; `contract: 20 fixture burritos, 0 failed`; `bundle android: pass`,
`bundle ios: pass`.

### Not verified

- No screen was rendered: light, dark, reduced blur, 360 px width, dynamic type at the maximum, RTL and
  screen reader labels are unverified beyond the code.
- Frame play steps every 6 s (`frameDwellMs`, from the prototype); story audio is never available.
| `npm run checks` once the first screens called `words.t('common.back')` | `FAIL strings`, 80 findings such as `ChooseLanguage.tsx:27 has the literal "common.back"` (the prose rule reads a dotted key as prose) | the scan takes the English keys and failure codes as names, not copy: `pass strings ... 98 screen and shared files hold no literal copy` |
| `reads a string key or a failure code as a name, not as copy` in `scripts/checks/strings.test.ts` | my own expected list missed `common.close`: `expected [ 'common.back', 'http.offline', ...(2) ]` | 8 passed |
| `npx tsc` with `ThemedText` taking a `role` prop | `TS2322: Type 'string' is not assignable to type 'undefined'` (React Native's `Text` already has `role`) | the prop is `variant` |
| `npx tsc` with the Languages header calling `words.t('transfer.open')` | `TS2554: Expected 2 arguments, but got 1` (the languages words did not cover the `transfer` area) | `LanguagesWords` covers `transfer` |
| `knip` with the `sharedPrimitivesAwaitingScreens` entries removed | 20 unused exports and 51 unused types in the four shared barrels | the shared barrels are entries as the public surface of `src/shared/*` |

### Decisions

- **Routes.** `app/_layout.tsx` renders an Expo Router `Stack` with `Stack.Protected`: `onboarding` while
  `onboarding.needed()`, otherwise `(tabs)` and `languages` (a modal). The root re-reads `needed()` on every
  preference change through `home.onChange`, so choosing a language (or English) lands on Home. `app/(tabs)`
  holds the Home route; Study and Formation are registered as tab names only (T11 and T12 add
  `app/(tabs)/study.tsx` and `app/(tabs)/formation.tsx`). The bundle passes without them.
- **Tab bar.** `app/(tabs)/_layout.tsx` re-exports `src/features/home/screens/TabsLayout.tsx`, since Home's
  words own the `nav.*` labels and a nested layout may reach a feature only through its screens.
- **Shared pieces** in `src/shared/ui`: `ScreenScaffold`, `Header`, `IconAction`, `SectionTitle`, `Row`,
  `Card`, `Tappable`, `ProgressBar`, `EmptyState`, `Notice`, `Badge`, `Dot`, `Sheet`, `Logo`, `TabBar`,
  `ThemedText`, `useAsyncValue`, `useChanges`, and the prototype literals in `prototypeValues`
  (exception recorded).
- **Logo.** The two horizontal lockups are imported from `design-system/assets/logo/` through a scoped alias,
  as the fonts are, rather than copied (exception recorded).
- **Strings check.** A literal that is exactly an English string key or a failure code is a name, not copy.
- **Home checks the catalog** on first render (`home.checkForUpdates()`, HO-8) so what is new appears without
  opening Languages. HO-8 now asserts it through the Home service; the method was written before the
  assertion, so this part was not observed red.
- **Progress** on Home and in Languages is read again every second while a pack installs, since no service
  offers a change signal for install progress. Inference: a `packs` progress listener on the service would
  replace the polling.
- **No new strings, no new dependencies.**
- **Web rendering harness: not built.** `react-native-web` would need a third adapter set for Files and Db
  (the platform adapters use expo-file-system and expo-sqlite, which have no usable web implementation here,
  and the memory adapters live in `sim/`, which app code may not import). Rule: every port has exactly two
  adapters. Left for a decision.

`npm run verify` exit 0: `Test Files 45 passed`, `Tests 465 passed`; typecheck pass on the three projects;
`5 checks, 0 pending, none failed`; `sim: 46 scenarios, 46 passed, 0 failed`; `trace: 51 Must requirements,
44 with a scenario, 1 with a test only, 6 unproven`; `contract: 20 fixture burritos, 0 failed`;
`bundle android: pass` (1817 modules), `bundle ios: pass` (1683 modules).

### Not verified

- No screen was rendered in light, dark or reduced-blur mode, at 360 px, with dynamic type at the maximum, or
  in right-to-left. AGENTS.md section 7 asks for all of these; none was done.
- The iOS modal presentation of Languages keeps the status bar spacer, which may leave extra space at the top
  of a page sheet. Inference from the code.
- On Android the tab bar sits outside the aurora's blur target, so it shows its fill without blur. Inference.
- The impact story image is not shown: a remote `url` would be a request outside the Http port and a Files
  `path` has no address a screen can reach. The well shows the prototype's gradient under the title.
- Saved articles show the last segment of the article id as their title; Study owns the article titles.
- Home opens a saved item with `/study?bookmark=<id>`, and Languages opens `/transfer`; neither route exists
  on this branch (T11 and T13).
- `Linking.openURL` for Give and the full story, `Intl.DateTimeFormat` on Hermes, and `Stack.Protected`
  redirects were not run on a device.
| `sim/study-service.test.ts`, written before the service change | `TypeError: services.study.originalOf is not a function` | 2 passed |
| `reads a string table key as a key, not as copy` in `scripts/checks/strings.test.ts` | `expected [ 'study.helps.notes', …(3) ] to deeply equal [ 'not.a key' ]` | 8 passed |
| `npm run checks` with the screens, before the scan change | `FAIL strings`: 96 findings, every one a dotted key such as `study.nav.next` | `87 screen and shared files hold no literal copy` |

### Decisions

- Routes: `/study` (tab, optional `reference`), `/study/library`, `/study/search`, `/study/article/<id...>`
  (catch-all, so article ids keep their slashes), `/study/story/<number>`. Share pushes
  `/share?kind=passage&ref=<reference>&language=<code>`, a route no task has built yet.
- The study service gains `books()`, `originalOf(book)` and `original(reference)`; the original-language
  text is a third reading choice, labelled with the Hebrew or Greek resource name, shown only once installed.
- Playback is not wired: no kernel module drives the Audio port. Proposal
  `docs/proposals/2026-09-29-audio-player.md`; until then the play control is disabled with the
  `failure.audio.unavailable` hint, and the download action works.
- Book names in the picker are the domain's English names, the same ones the passage carries.

### Not verified

- Nothing was rendered: light, dark and reduced-blur, 360 px width, dynamic type, RTL passages (Hebrew,
  Arabic, Urdu, Farsi), the Android blur target and the book picker modal are unseen.
- `textAlign: 'auto'` with `writingDirection` and the `direction` style for right-to-left passages is an
  inference about iOS and Android behaviour.

## 2026-09-29 T8 Feature services, preference owners and the partner invitation

Node v22.22.2. Everything below ran in Node through Vitest, the sim, the checks and the Metro bundle; nothing
ran on a phone and no screen exists yet (T10 to T12).

### Observed red, then green

| Test | Red | Green |
|---|---|---|
| ON-1, ON-2 (onboarding), ON-3, ON-4, HO-1 to HO-7, ST-1, ST-5 (library cards), ST-10, PA-1, PA-2, PA-3, PA-4, PA-6, SE-1, written before any feature service | each `Error [ERR_MODULE_NOT_FOUND]: Cannot find package '@features/about' imported from sim/services.ts` | `sim: 46 scenarios, 46 passed, 0 failed` |
| PA-2 with `invitationFirstDay = 4` (throwaway) | `FAIL PA-2 ... Expected values to be strictly deep-equal` | pass |
| PA-2 with a 30-day quiet period (throwaway) | `FAIL PA-2 ... Expected values to be strictly deep-equal` | pass |
| ON-3 with `home.name` in the preferences snapshot (throwaway) | `FAIL ON-3 ... the name is in no journal, snapshot or request` | pass |
| HO-2 ignoring the UTC offset (throwaway) | `FAIL HO-2 ... the hour and the date are local, not UTC` | pass |
| ST-10 without the `BookmarkRemoved` redo handler (throwaway) | `FAIL ST-10 ... Expected values to be strictly deep-equal` | pass |
| SE-2 type test (`src/shared/glass/names.test.ts`) with `GlassIconButton.label` optional (throwaway) | `names.test.ts(8,7): error TS2322: Type 'false' is not assignable to type 'true'.` | typecheck pass |
| `tests/intl-polyfill.test.ts` without the Arabic plural data (throwaway) | `AssertionError: expected { en: [ 'other', 'one', ... ] } to deeply equal ...` | 1 passed |
| `the invitation rule ... stays quiet for ninety days` (my own test setup was wrong: shown after the dismissal) | `expected { state: 'due', ... } to match object { shown: false }` | 3 passed |
| `app/_layout.tsx` importing `@lib/network`, added to the refused list after the allowance was removed | refused (`no-restricted-imports`) | `Tests 120 passed` in `boundaries.test.ts` |

The ST-5, HO and PA scenarios passed at their first run once the services existed; the throwaways above show
they fail without the behaviour they name.

### Decisions

- **Preference-shaped owners are kernel modules** (`preferences`, `bookmarks`, `partners`), not feature
  stores: a feature service sees only the kernel, so a `store.ts` has no port and cannot emit, and every value
  is written or read by several features. Exception and proposal:
  `docs/proposals/2026-09-29-preference-owners-in-the-kernel.md`. No feature has a `store.ts`.
- **Current content language** is `study.language`, one writer (`preferences`), set by Onboarding, Languages
  (LA-5) and read by every feature. Onboarding is needed while it is unset.
- **Last passage** is `study.lastPassage.<language>`, written by `preferences` when it observes
  `PassageOpened`, so replay rebuilds it from the verbatim events.
- **"Now"**: services that need the time take it from the caller: `home.greeting({ at, utcOffsetMinutes })`
  and `invitation(at)`. The screen passes `Date.now()` and the offset; the sim passes its clock. Emitted times
  still come only from the journal.
- **Typed text in replay**: `home.name` and `settings.locale` are journaled without a value; their redo
  journals the same event and stores nothing, and the snapshot shows neither, so the replayed snapshot matches
  (ON-3, SE-1).
- **Bookmarks carry the language** (`BookmarkAdded.language`), since Home words each saved item with it.
- **Invitation**: region from the Locale port's region or a US time zone; fifth distinct day of use from a
  `partners` checkpoint fold of `AppOpened` days; hidden ninety days after a dismissal; `InvitationShown`
  once per cycle. Inferences are listed in `docs/impact-stories.md`.
- **Impact stories**: one shipped story, a feed at a named constant with an undecided address, images
  downloaded beside and renamed over under `partners/images/`. New events `ImpactStoriesRefreshStarted`
  (redo) and `ImpactStoriesRefreshed`; new failure code `partners.invalid-feed`, step `impact-stories`.
- **Online signal**: `catalog.online()` exposes the Http port's offline signal so Home and Study can say a
  download waits for a connection.
- **Resource types** for the library cards and About are one classification, `resourceTypeOf` in
  `src/lib/catalog/resourceTypes.ts`.
- **Words**: `kernel.strings.words(locale)` binds a locale; each feature's `strings.ts` narrows the keys to its
  areas and binds the app locale from `preferences`. Size formatting uses `Intl.NumberFormat`, which lint keeps
  out of `src/lib`, so it lives in the three feature `strings.ts` that need it (settings, home, languages).
- **Exception closed**: the root layout's `@lib/network` allowance. `src/lib/kernel.ts` re-exports `hostOf`
  and `isAllowedUrl`; the lint layer admits only `@lib/kernel`, and a boundary test refuses `@lib/network`.
- **Appearance**: the root layout reads `appearance()` and `onAppearance` from the settings service; the
  system scheme and the reduced-blur default apply when no override is set.
- **Plural rules on Hermes**: `src/platform/intl.ts` loads the formatjs polyfills and CLDR plural data for the
  sixteen locales, imported first in `app/_layout.tsx`. That Hermes lacks `Intl.PluralRules` is an inference;
  the polyfill installs only when it is missing.
- **Trace stays reporting.** `--enforce` would fail on SH-1, SH-2, SH-4, SH-5 and DX-2 (Transfer and Share,
  in progress elsewhere), SE-2 (a test, not a scenario, since the sim renders nothing) and DX-4.

`npm run verify` exit 0: `Test Files 45 passed`, `Tests 459 passed`; `owns: 11 owners, 20 tables, 14
created by migrations, one writer each`; `5 checks, 0 pending, none failed`; `sim: 46 scenarios, 46 passed, 0
failed`; `trace: 51 Must requirements, 44 with a scenario, 1 with a test only, 6 unproven`; `contract: 20
fixture burritos, 0 failed`; `bundle android: pass`, `bundle ios: pass`.

### Not verified

- Nothing ran on a phone: the polyfill on Hermes, `Intl.DateTimeFormat` with `timeZone: 'UTC'` for the Home
  date on Hermes, the Kv and SQLite writes of the new modules on the platform adapters, and the root layout
  re-rendering on an Appearance change.
- **Audio streaming (ST-4)**: the fixtures carry no stream address, so Study offers only the downloaded clip
  or the audio pack download; `AudioView` has no streaming state yet.
- **Never modal (PA-2)** and **SE-2** beyond the type level are screen properties, for T10 to T12.
- The shipped impact story's body, its security note and its image await communications
  (`docs/impact-stories.md`). The BT Servant link is the prototype's placeholder, `https://unfoldingword.org`.
- The feed address `https://unfoldingword.org/app/impact-stories.json` is not published; PA-6 was proven
  against the sim serving that address.
- Six new strings were drafted in fifteen locales by an agent (`docs/strings-review.md`).
## 2026-09-29 F2 fixes from review 2: verify

- Red in the first full `npm run verify`: `sim/packs-streaming.test.ts` timed out at 5 s (6.6 s under the
  parallel run) on the 12 MB import. Each byte was hashed three times: the file-import peek, the unpack,
  and a second pass from disk. Changed after the Packs entry above was written: the peek reads metadata
  and licences only (`unpackArchive(..., { hash: false })` and `validateFacts(..., { contents: false })`),
  checksums are checked once on the bytes as they are written, and the check on disk before the rename is
  of each ingredient's size. The file is imported whole or not at all as before; a corrupt import now fails
  after `PackInstallStarted` with `pack.checksum-mismatch` instead of before it. The two heavy tests carry
  30 s and 60 s limits. Inference: three MD5 passes of a 220 MB pack in JavaScript on a low-end phone would
  have cost the better part of a minute.
- `npm run verify` exit 0: `Test Files 45 passed`, `Tests 516 passed`; knip clean; `owns: 8 owners, 26
  tables, 16 created by migrations, one writer each`; `provenance: 60 corpus values ... 164 pieces`;
  `strings: 405 keys in 16 locales`; `sim: 26 scenarios, 26 passed, 0 failed`; `trace: 51 Must
  requirements, 26 with a scenario, 2 with a test only, 23 unproven` (reporting only); `contract: 20
  fixture burritos, 0 failed` (live skipped, offline); `bundle android: pass`, `bundle ios: pass`.

## 2026-09-29 F2 fixes from review 2: what was fixed elsewhere, skipped or only considered

- Skipped, left to the release-wiring task as asked: finding 12 (`app.config` permissions and backups:
  expo-audio's microphone and foreground-service defaults, iCloud and Android backup of `packs/` and
  `uw.db`) and finding 13 (a failed boot leaves a blank screen in `app/_layout.tsx`).
- Considered, not changed: coarser timestamps for the reading trail in an exported journal. Replay (DX-3)
  rebuilds a device to the same snapshot from the recorded `at` of every event, so coarsening only the
  export breaks that equality, and coarsening at record time changes every module's time facts. The
  journal leaves the device only when a leader shares it (DX-2), and no event carries typed text. A
  proposal is the place to trade this off; `PRAGMA secure_delete` for notes is done.
- Duplication: the unfoldingWord-first order, `isRecord` in Catalog, the reading of a corpus kind and the
  byte joining in `src/lib/burrito` each have one home now. `isRecord` in `src/lib/telemetry/folds.ts` and
  `joined` in `src/platform/http.ts` remain: Telemetry is being changed on the Transfer branch, and the
  platform layer may not import lib values.

## 2026-09-29 F2 fixes from review 2: platform adapters

Typecheck and lint only; none of this ran on a phone, and the platform adapters cannot run in Node.

- Audio: a stream URL is resolved through the Http port before the player sees it: a `HEAD` request that
  follows redirects one hop at a time against the host allowlist (the Http adapter's own rule), and the
  player is handed the URL it landed on, re-checked against the policy. A refused hop is
  `http.host-refused`, no connection `http.offline`, a non-2xx answer `audio.unavailable`. Not verified: a
  host that answers `HEAD` with 405 cannot be streamed this way (the downloaded audio pack still plays),
  and a host could still redirect the player's own `GET` after a clean `HEAD`; downloading before playing
  would close that, at the cost of waiting.
- Files: `list` no longer walks each directory to size it (the port contract now says a directory's
  `bytes` is 0; `size` still sums one). Start-up garbage collection lists only the directories on the way
  to a recorded burrito.
- Db: `PRAGMA secure_delete = ON` after WAL, so a deleted group note is overwritten in the database file.

## 2026-09-29 F2 fixes from review 2: Corpus memory and full-text search

Node v22.22.2 (SQLite 3.51.2 in `node:sqlite`), in Node through Vitest and the sim. expo-sqlite bundles
SQLite 3.50.3 (`node_modules/expo-sqlite/vendor/sqlite3/sqlite3.h`), and 3.49.1 in its SQLCipher build;
the trigram tokenizer needs 3.34 and its `remove_diacritics` option 3.45, so both qualify. Not run on a
phone.

| Test | Red | Green |
|---|---|---|
| `sim/corpus-memory.test.ts` (vitest now runs with `--expose-gc`): a 22 MB aligned text of eight books, heap after `gc()` | `opening 8 books kept 49 MB against 8 MB for one` (limit 4 times one book) | 8 MB for one book, 18 MB for all eight, 18 MB after building the index |
| ST-9 extended: `indexWanted`, `dropIndex`, the cost read from nothing, a passage opening while the index builds, an audio pack leaving the index alone, a text update rebuilding it with `IndexBuilt` only, a removal keeping the wish and a reinstall building again, and Chinese words of two, three and four characters found mid-sentence | `corpus.indexWanted is not a function` | pass |
| `src/lib/corpus/source.test.ts`: `tokenizerFor` picks trigrams for `zh`, `zh-tw` and text with almost no spaces | no export | pass |

The ordering assertion in ST-9 (`IndexStarted`, `PassageOpened`, `IndexBuilt`) was not run against the old
code; that the old code put `PassageOpened` after `IndexBuilt` (reads waited on the queue the build ran in)
is read from the code.

Decisions:

- Parse caches: book-scoped values (a USFM book, a book's notes, word links or questions) live in one LRU
  of at most 4 entries and 32 MB of source bytes (always keeping the newest); everything else in an LRU of
  256. Inference, not measured on a real pack: at the review probe's 3.5 heap bytes per aligned USFM byte
  (47 MB for a 13.4 MB Psalms), the book cache is bounded near 110 MB, and a Psalms passage with its helps
  (roughly 18 MB of source, estimated) stays cached whole. Titles by language and the title index for links are memoized and rebuilt on change.
- The index is built book by book, parsed outside the caches, and written in batches of 100 rows, each
  its own transaction with one multi-row insert, so the platform database lock is released between
  batches. Builds run on their own queue; reads never wait for them.
- Each language's index has a generation. A build writes a new generation beside the old one, then in one
  transaction removes every other generation and records the new one, so search never sees a half-built
  index, and a crash mid-build leaves the old one (the stray rows go at the next build).
- Two FTS5 tables: `corpus_fulltext` (`unicode61 remove_diacritics 2`) and `corpus_fulltext_trigram`
  (`trigram remove_diacritics 1`). A language is indexed by trigrams when its base code is one of a list of
  languages written without spaces (Chinese varieties, Japanese, Thai, Lao, Khmer, Burmese, Tibetan,
  Dzongkha, Yi, Shan, Tai Dam), or when the first hundred entries hold fewer than one space per fifty
  letters. A query term shorter than three characters in a trigram index is matched with `LIKE` (a scan
  of that language's rows); longer terms go through `MATCH`.
- The wish for an index is a fact Corpus keeps: `corpus_index_wanted`, set by `reindex` and cleared by
  `dropIndex` (event `IndexDropped`, redo). `indexWanted(language)` exposes it. Migration
  `0101-corpus-fulltext` drops the old index (its table had no generation column) and keeps the wish, so
  an index built before this change is rebuilt on the next text install or `reindex`, not on start.
- The storage cost is estimated from the byte sizes Corpus already holds: verses from the books in scope
  (26 a chapter) capped by bytes over 120, text capped at 400 bytes a verse, times 3 for words or 6 for
  trigrams, plus 96 bytes an entry. The fixture's built index stayed under the estimate.

## 2026-09-29 F2 fixes from review 2: Packs installs by streaming, one directory per install

Node v22.22.2, in Node through Vitest and the sim; nothing ran against expo-file-system.

| Test | Red | Green |
|---|---|---|
| `sim/packs-streaming.test.ts`: a 12 MB aligned Psalms and Isaiah text imported from a file | with `src/lib/packs`, `src/lib/burrito` and `corpus.ts` from `a1c6cd9`: `expected 12034064 to be less than or equal to 262144` (the whole book read at once) | the largest read is 64 KiB, the largest write well under a quarter of the largest book, and the burrito on disk validates |
| `sim/packs-streaming.test.ts`: an update of `qaa_tn` touches no file of the ten burritos it keeps | same old code: `expected [ …(106) ] to deeply equal []` (every kept burrito read and copied) | no read, no write under a kept root, roots unchanged |
| `sim/packs-streaming.test.ts`: an archive that fits but would not fit unpacked | passes on the old code too (the full disk surfaced as `files.no-space` while writing) | refused as `pack.no-space` from the zip central directory before unpacking; nothing left under `packs/` |
| LA-7 rewritten: old release whole on each failure, the passage reads v1 while v2 downloads and v2 only after, kept roots unchanged, and three crash windows | old layout: `+ packs/language/qaa/unfoldingWord/qaa_tn/ingredients/` for the release directories; with the new layout and no Corpus reconcile yet: `files.not-found: packs/language/qaa/id-000005/unfoldingWord/qaa_tn/metadata.json` after the crash between the database row and the ingest | pass |
| `sim/adapters` contract: `list` is one level deep, a directory's `bytes` is 0 | memory adapter listed `inner` with 4 bytes | both adapters; `size` still sums a directory |

The crash windows are proven with `sim/crash.ts`: at a trigger (a database write, a file operation) every
later write on the device is refused, as if power went, and the device then restarts over the same
adapters. After the files are written and before the `packs` row: the old release stays, the new
directory is removed on start. After the row and before the Corpus ingest (the `PackInstalled` journal
row is refused, so the journal never holds it): the new release stays and Corpus catches up on start.
After the ingest and before the old directory is removed: the old directory is removed on start.

Decisions:

- Layout: `packs/{kind}/{language or pack}/{install}/{publisher}/{resource}`. `PackInstalled.burritos.root`
  is a new field kind, `path` (segments of letters, digits, `._+-`, no `..`, at most 256 characters).
- Unpacking: `src/lib/burrito/unpack.ts` reads the archive in 64 KiB ranges, inflates with fflate's
  streaming `Unzip`, appends each chunk to staging and hashes it with an incremental MD5, keeping only
  `metadata.json` and licence files in memory. Validation runs on those facts (`validateFacts`), then each
  listed ingredient is hashed again from disk before the rename; unlisted files are removed.
- A file import is read twice (once to learn its pack and check it, once to unpack); a catalog or peer
  archive once. A peer receipt may now be a path (`PeerReceipt` `{ ok: true, path }`) so Transfer can hand
  over the file it received instead of reading it into memory; the `archive` form still works.
- Free space: the unpacked size from the central directory is checked against free space before
  unpacking. A HEAD request before the download was tried and dropped: it consumed the scripted
  outcomes of the sim, and whether DCS answers HEAD on `sb/{tag}.zip` is unknown. A download that fills
  the disk still fails as `pack.no-space`.
- Corpus ingests a pack in one transaction, reads only burritos it has not seen (a root is never
  reused), waits for reads in flight before and after swapping, drops the pack if it cannot read it (so
  no entry points at a directory about to go), and on start reconciles its tables against the installed
  packs.
- Reads no longer wait behind the Corpus write queue; they see the library as it stands.

Not verified:

- expo-file-system on Android moves a directory by copy and delete when a rename fails
  (`CopyMoveStrategy.kt`, read in the review, not here). The rename of a new burrito from staging to its
  directory is therefore not atomic on such a device, but a crash mid-move leaves a directory no row
  names, which the next start removes; atomicity now rests on the database row.
- Peak memory on a phone. The sim bounds the size of reads and writes; the heap is measured in the
  Corpus test below.

## 2026-09-29 F2 fixes from review 2: Catalog

Node v22.22.2, in Node through Vitest and the sim. The live catalog was not reached (git.door43.org is
blocked here), so the paging parameters are from the Gitea and DCS API as I know it: `limit` and `page`, 50 a
page. That the DCS server honours `limit=50` is an inference.

| Test | Red | Green |
|---|---|---|
| `sim/catalog.test.ts`: pages of fifty until a short or empty page, with and without `X-Total-Count` | `refresh` stopped after one page with no total count | pass |
| `sim/catalog.test.ts`: dropped entries counted in the outcome and in `CatalogRefreshed` | no `dropped` | pass |
| `sim/catalog.test.ts`: two refreshes run one after the other, the last wins, and a replay of overlapping refreshes has no divergence | the older returned `catalog.superseded` with no `CatalogRefreshed`, which a replay could not reproduce | pass |
| `src/lib/catalog/catalog.test.ts`: `ne-x-kathmandu_OBS.v2` with language `ne-x-kathmandu` and tag `v2.0.1-2026` is keyed; a name with a space or `..` is not | undefined | pass |
| `src/lib/catalog/catalog.test.ts`: English names for 22 codes beyond the old table | 21 failed (the autonym came back) | pass |

- `CatalogRefreshed` gains `dropped` (a count, so no text enters the journal). Refreshes are serialized in
  Catalog, so `catalog.superseded` is gone: the code, its sixteen strings and its only emitter (grepped:
  no other reference).
- Field kinds widened: `resource` takes upper case and dots up to 64, `tag` up to 64, a language subtag up
  to 16 characters and six subtags. None admits a space, a slash or a leading dot.
- English names: `src/lib/catalog/isoNames.ts` holds every ISO 639-1 code and about 200 ISO 639-3 codes
  that Door43 publishes in or that I expect it to (South Asian, Philippine, African, Arabic varieties,
  Chinese varieties, Kurdish, Persian, Quechua), plus tags such as `zh-tw` and `pt-br`. Written from
  memory of ISO 639 reference names, not fetched from `td.unfoldingword.org` (blocked here); a name not in
  the table falls back to the autonym. Refreshing the table from `langnames.json` is a follow-up.

## 2026-09-29 F2 fixes from review 2: reading real releases

Node v22.22.2, in Node through Vitest and the sim; no real release was read (git.door43.org is blocked
here), so every format below comes from what I know of unfoldingWord and Door43 releases. That is an
inference, labelled as such where it matters.

| Test | Red | Green |
|---|---|---|
| `src/lib/corpus/tsv.test.ts`: nine-column notes, rows counted as read, `1:2a` and `2:front` | 3 failed: nine-column rows `[]`; `helpsRowCount` 2 for one readable row; `1:2a` undefined | pass |
| `src/lib/corpus/alignment.test.ts`: repeated words, gaps (`…`, `&`), the nth phrase past a shared word | 2 failed: `καὶ λέγει καὶ` attached `[0, 1]` | pass |
| `src/lib/corpus/usfm.test.ts`: `\d` kept, `\fig`, `\va`, `\vp`, `\ca` dropped | 2 failed: `titles` undefined; `A picture|src="x.jpg" ... Many say 3 of my soul.` | pass |
| `src/lib/corpus/links.test.ts`: `rc://*/obs/book/obs/01/01`, `rc://*/tn/help/obs/01/02`, `rc://*/obs/50`, `rc://*/bible/gen/01/02` | 1 failed: all unresolved | pass |
| `src/lib/corpus/readings.test.ts`: literal or simplified from the repository code, the burrito abbreviation, then its name; study helps | failed: no module | pass |
| ST-2 extended: a nine-column notes release and a repeated-word quote imported from files, and a psalm title | with `alignment.ts` from `b416757`: `+ 'and said'  - 'and said and'` | pass |
| ST-3 extended: `rlob` and `rsob` texts imported from files | with `ingest.ts` and `layout.ts` from `b416757`: `availableTexts` `[]` | pass |
| `sim/corpus.test.ts`: story questions from `qaa_obs-sq` carry `study: true` | `study` undefined | pass |

Decisions and inferences:

- Notes TSV: the current seven-column form (`Reference ID Tags SupportReference Quote Occurrence Note`) and
  the older nine-column form (`Book Chapter Verse ID SupportReference OrigQuote Occurrence GLQuote
  OccurrenceNote`) are both read, by header name. `front`/`intro` in the older columns is an introduction.
  A verse part (`2a`) is the verse. The row count in the corpus summary is of rows that parse.
- A quote is matched as a phrase: the verse's original words are put in an order that is the target
  text's order with each word's occurrences kept ascending (the source order is not in the aligned text;
  this is an approximation), and the nth contiguous match of the quote is taken, or the nth match with
  gaps when there are fewer contiguous ones. `…`, `...` and `&` separate the parts of a quote.
- Literal or simplified: pinned codes `ult ulb glt rlob irv ayt` are literal, `ust udb gst rsob ueb` are
  simplified, read from the repository name after the language, then from the burrito abbreviation;
  otherwise a burrito named with a word for simplified, dynamic or easy (in the sixteen locales' languages)
  is simplified; anything else is literal. `irv` (Hindi and Bengali Indian Revised Version) and `ayt`
  (Indonesian Alkitab Yang Terbuka) being literal, and `rlob`/`rsob` being the Russian literal and
  simplified open Bibles, are inferences from memory of DCS; `ar_nav` and `fa_opcb` are not pinned because
  I could not place them with confidence.
- `\d` before the first verse is the chapter's title (Psalm superscriptions), shown in `PassageText.titles`
  when the passage includes verse 1; `\d` inside a verse stays in its text.
- Study Notes and Study Questions stay in the notes and questions of a passage or story, now with
  `study: true` (repository codes `sn`, `sq`, `obs-sn`, `obs-sq`).
- The unfoldingWord-first order is `comparePublishers` in `src/lib/order.ts`, used by Catalog and Corpus;
  `isRecord` in Catalog comes from `src/lib/burrito/metadata.ts`; the reading of a corpus kind is
  `readingOfKind`.

## 2026-09-29 F2 fixes from review 2: Strings

Node v22.22.2, in Node through Vitest and ESLint; nothing ran on a phone.

| Test | Red | Green |
|---|---|---|
| `scripts/checks/plural.test.ts`, written before `src/lib/strings/plural.ts` | `Cannot find package '@lib/strings/plural'` | 32 passed: each of the sixteen locales picks the same category as Node's `Intl.PluralRules` over 0 to 2,399, round millions and six decimals, and lists the same categories |
| `src/lib refuses ... new Intl.PluralRules(locale)` (two cases moved from "allows" in `scripts/eslint/boundaries.test.ts`) | `expected false to be true` for both | pass, after the `PluralRules` allowance left `scripts/eslint/lib-globals.ts` |

- `Strings.plural` selects the category from the CLDR rules held as data, so Hermes needs no `Intl`.
  `npm run checks` asks each locale for the categories of the same table.
- `ru` and `ar` Formation words and `ru` `movement.discourse` changed; the `es-419`, `fr` and `pt-BR` `many`
  forms were reviewed and kept. Reasons in `docs/strings-review.md`.
- Not verified: Hermes itself (no phone run); the new words by a native speaker.

## 2026-09-29 T6 Formation

Node v22.22.2. Everything below ran in Node through Vitest, the sim and the checks; nothing ran on a phone
and no screen was rendered.

### Observed red, then green

| Test | Red | Green |
|---|---|---|
| `reads copy tables as copy, not as SQL writes` in `scripts/checks/owns.test.ts` | `TypeError: writerSources is not a function` | 3 passed |
| `npm run checks` with a throwaway `src/lib/strings/throwaway.ts` holding `'Update when you are ready'` | old scan: `FAIL owns ... src/lib/strings/throwaway.ts writes when, which no one owns` | new scan: `pass owns`; throwaway removed |
| FO-1 to FO-6, written before `src/lib/formation` existed | each `FAIL`, e.g. FO-1 `Cannot read properties of undefined (reading 'tracks')` | 6 pass |
| DX-3 with the `GroupCreated` redo handler removed (throwaway) | `FAIL DX-3 ... Expected values to be strictly deep-equal` | pass |
| FO-4 with the group name added to the snapshot positions (throwaway) | `FAIL FO-4 ... the snapshot never holds the group name Tuesday group` | pass |

A third throwaway emitted `SessionNoteSaved` with the note text in its payload. FO-6 stayed green because
the journal refused the event (the schema has no text field), so the note never reached the journal. That
shows the schema guard, not the scenario, catching the leak.

### Decisions

- Formation reads Corpus through `corpusView(files, db)` in `src/lib/corpus/view.ts`. This is a read-only
  library over Corpus's own tables, using Corpus's own assemble functions, so Formation parses nothing. It
  emits no `StoryOpened` or `ArticleOpened`.
- A position's movement is one of the five movements. Drafting, checking and conclusion are session
  content, not positions. Training positions have no movement. `PositionChanged.movement` is an optional
  literal field, the first of its kind in `src/lib/domain/events.ts`.
- The active group lives in Formation's own `formation_state` table. Creating the first group, and
  starting, advancing or completing with a group, makes it active; `activate` (`GroupActivated`) sets it
  explicitly. Deleting it hands the role to the earliest remaining group.
- Replay of typed text follows `docs/replay.md` rule 3. `GroupCreated`, `GroupRenamed` and
  `SessionNoteSaved` redo with an empty stand-in for the name or note. The snapshot shows counts and
  positions by id only, so it cannot tell a real name from the stand-in.

`npm run verify` exit 0: `Test Files 39 passed`, `Tests 419 passed`; `owns: 8 owners, 19 tables, 13
created by migrations, one writer each`; `5 checks, 0 pending, none failed`; `sim: 26 scenarios, 26
passed, 0 failed`; `trace: 51 Must requirements, 26 with a scenario, 2 with a test only, 23 unproven`;
`contract: 20 fixture burritos, 0 failed`; `bundle: skipped`.

### Not verified

- Story audio: no pinned or provisional flavor carries audio for a story, so `session.play.audio` is always
  `{ state: 'not-available' }`.
- The `not-in-english` fallback state (English movements installed but missing the story) has no test,
  because the fixtures give English movements for every fixture story.
- A Formation read during a Corpus update can see the gap between Corpus's two transactions. Read from the
  code, not tested.
- The question lists are an inference: the list items of a movement, or else its paragraphs. No real
  five-movement content has been read.

## 2026-09-29 M6 merge of Strings (T7a) onto Catalog, Packs, Corpus and F1

Node v22.22.2. Everything below ran in Node through Vitest, the sim and the checks; nothing ran on a phone
and no screen was rendered.

- `git merge --no-ff t7a-strings` conflicted in this file, `scripts/checks/strings.check.ts` (T7a's check
  replaces the pending stub) and `src/lib/kernel.ts` (both sides kept; the registry pin in
  `sim/kernel.test.ts` and the kernel row in `docs/exceptions.md` gain strings).
- Red after the merge: typecheck, because `failure.*` in `src/lib/strings/en/failures.ts` lacked the four
  codes added on main (`http.cancelled`, `kernel.not-owned`, `kernel.observer-failed`, `corpus.unreadable`).
  Worded in English and the fifteen other locales; listed in `docs/strings-review.md`.
- Red next: the owns check read `update its records` and `Update when you are ready` as SQL writes to tables
  `its` and `when`. Both English strings reworded; the check is unchanged.
- `npm run verify` green: 36 test files, 401 tests; 5 checks pass (strings: 406 keys in 16 locales, each
  complete); sim 20 of 20; trace reports 30 Must requirements unproven (reporting only); contract 20
  fixture burritos, live skipped offline; bundle skipped, no `app/_layout.tsx` yet.
- Not verified: the new translations by a native speaker; any screen showing them.

## 2026-09-29 M5 merge of Corpus (T5) onto Catalog, Packs (T4) and F1

Node v22.22.2. Everything below ran in Node through Vitest, the sim and the checks; nothing ran on a phone,
against expo-sqlite or expo-file-system, and no screen was rendered.

### Merge

`git merge --no-ff t5-corpus` conflicted in five files, each kept from both sides: `src/lib/kernel.ts`
(telemetry, catalog, packs, corpus), `src/lib/domain/failures.ts` (the pack codes and `corpus.unreadable`),
`sim/kernel.test.ts` (the registry pin gains corpus; the F1 owns test stays), this file (F1, T4 and T5
entries), and `scripts/checks/provenance.check.ts` (T5's real check replaces the pending stub). Adapted to
F1: `DbSession`/`Row` became `DbTransaction`/`DbRow`; five `localeCompare` calls in `src/lib/corpus` became
`compareText`. `npm install` left `package-lock.json` unchanged (T5 already locked marked and yaml);
`rm -rf node_modules && npm ci` then installed cleanly.

### The seam

- Corpus `observe`: `PackInstalled` → `ingest({ pack, burritos })`, `PackRemoved` → `drop(pack)`, both
  returned as promises so the Packs emit resolves only after the corpus shows the change.
- `RowId` in `src/lib/burrito/flavors.ts` is now `ResourceRow` from `src/lib/domain/pack.ts`, so the event
  payload is the ingest source with no mapping.
- `corpus.describe()` and the directory walk in `src/lib/corpus/source.ts` (with its own `packsDirectory`,
  `packDirectory` and `unrecordedCommit`) are removed. Grepped `describe(`, `describePack`,
  `packDirectory` and `unrecordedCommit` across `src`, `sim` and `scripts`: the only callers were
  `sim/corpus-fixtures.ts` and tests.
- ST-2 to ST-9, `sim/corpus.test.ts` and the provenance check install through `packs.installFromCatalog`
  (helper `sim/install.ts`) or `packs.install(fromFile)`; removals go through `packs.remove`.
  `sim/corpus-fixtures.ts` is deleted after a grep found no remaining reference.

### Observed red, then green

| Test | Red | Green |
|---|---|---|
| ST-2 after the merge, before the seam | `files.not-found: packs/language/qaa/unfoldingWord/qaa_ult/metadata.json does not exist`: on restart Packs cleans a pack its database never recorded, so content written beside Packs vanished | pass |
| `corpus follows Packs ... (LA-2, LA-6, LA-7, PRD 8.5)` in `sim/corpus.test.ts` | With the `PackRemoved` reaction removed: `expected [ 'qaa' ] to deeply equal []`, and ST-5 and ST-9 failed. With `PackInstalled` ignored for a pack already ingested: `expected [ 'v1' ] to deeply equal [ 'v2' ]` (update showed the old release) | 12 passed |
| DX-3 | New assertions: the library device reindexes and opens a passage after its update and removal; the replayed snapshot carries `modules.corpus` with languages qaa and qab and the qaa index, and one notes release | pass |

`npm run verify` exit 0: `Test Files 34 passed`, `Tests 380 passed`; `owns: 6 owners, 16 tables, 10 created
by migrations, one writer each`; `provenance: 60 corpus values rendered from every pack in the fixture
catalog, installed through Packs, 164 pieces, each with a CC BY-SA 4.0 licence`; `5 checks, 1 pending, none
failed`; `sim: 20 scenarios, 20 passed, 0 failed`; `trace: 51 Must requirements, 20 with a scenario, 1 with a
test only, 30 unproven`; `contract: 20 fixture burritos, 0 failed` (live skipped, offline); `bundle: skipped`.

### Not verified

- A crash between the Packs swap and the `PackInstalled` emit leaves Packs and Corpus disagreeing; Corpus
  `start` rebuilds from its own tables and does not reconcile against `packs.installed()`.
- A thrown ingest is caught inside Corpus and recorded as `corpus.unreadable` with the pack; the path is
  proven only by calling `ingest` directly with an unreadable root, since Packs verifies every burrito first.
- An update drops a pack's corpus rows and writes the new ones in two transactions (read from
  `src/lib/corpus/corpus.ts`, not tested for a crash): a crash between them leaves the pack out of the corpus
  until it is installed again. Async reads wait for a pending ingest; the synchronous `summary()`,
  `languages()` and snapshot could see the gap, which no test exercises.
## 2026-09-29 T9b platform adapters and the composition root

Node v22.22.2. Everything below ran in Node through Vitest, lint, typecheck and `expo export`. **Nothing ran on a
phone**: every platform adapter is typechecked and bundled, none has executed. Device run pending.

### What ran

- `src/platform/`: one adapter per port (clock, ids, files, db, kv, http, audio, share-sheet, locale, transport),
  `createPlatformPorts(policy)`, `discoverMigrations()` and `reducedBlurByDefault()`. `app/_layout.tsx` creates
  the kernel once with them, starts it, and provides it through `KernelProvider` in `src/shared/kernel`.
- `npm run bundle` with `app/_layout.tsx` and no route file: `bundle android: pass, Android Bundled 12078ms
  node_modules/expo-router/entry.js (1425 modules)`, `bundle ios: pass, iOS Bundled 11945ms ... (1291 modules)`.
  An unminified `expo export --platform android --no-bytecode` holds all four migration ids and
  `CREATE TABLE packs`, so `require.context` found `migrations/` on the device path, plus `redirect:'manual'`,
  `credentials:'omit'`, `BEGIN IMMEDIATE` and `uw-preferences.db`.
- `sim/adapters/contract.ts`, the port contract: 16 cases over Files, Db (with FTS5), Kv, Http, Clock, Ids,
  Locale, Audio and Transport, framework-free so a device harness can run it against `createPlatformPorts`.
  `sim/adapters/contract.test.ts` runs it against the memory adapters: pass. Observed red once: with the memory
  `readRange` throwing past the end of a file, "reads ranges clamped to the end ..." failed; restored. The
  second test replaces `rename` with one that overwrites and sees exactly the rename case fail.
- `src/platform/discover.test.ts`: migrations from both reserved locations in code-point order; refuses a
  non-migration, a mismatched id and a repeated id.
- Lint: with the `app root` layer back to `^@lib/(?!kernel$)`, `boundaries.test.ts` failed "app/_layout.tsx
  allows import { isAllowedUrl } from '@lib/network'" and `eslint app/_layout.tsx` reported the import; restored.

`npm run verify` then returned green (exit 0): 28 test files, 336 tests; `5 checks, 2 pending, none failed`;
`sim: 12 scenarios, 12 passed, 0 failed`; `trace: 51 Must requirements, 12 with a scenario, 1 with a test
only, 38 unproven`; `contract: 20 fixture burritos, 0 failed` (live skipped, offline); bundle both platforms
pass.

### Decisions later tasks follow

- **How a screen reaches its service.** A feature's `service.ts` exports `createXService(kernel: Kernel)`, pure
  over the kernel, which the sim can call directly. A screen calls `useService(createXService)` from
  `@shared/kernel`, which builds the service once per kernel and caches it. Nothing lists services;
  `src/features/_template/` shows the shape.
- **Reduced blur.** On by default on Android before API 31 (no RenderEffect blur before Android 12), off
  otherwise; `reducedBlurByDefault()` in `src/platform/display.ts`. No device model or identifier is read. The
  leader's override and the theme override enter through the root layout's `Appearance` value when T8's Home
  store holds them.
- **Http.** Redirects are followed by hand (`redirect: 'manual'`, at most five hops), each hop checked against
  the allowlist before it is requested; `url` in the response is the last hop. `timeoutMs` is an idle timeout,
  reset on every hop and chunk, so a large download is not cut off while bytes arrive. No cookies are sent
  (`credentials: 'omit'`). A thrown fetch is `offline` unless the adapter timed it out or it was cancelled. A
  download streams to Files in 1 MiB appends; `resumeFrom` sends `Range` and, when the server answers 200
  anyway, skips the bytes already on disk, so the result is 206 either way, as in the memory adapter.
- **Files** live under `Paths.document/device/`, so SQLite's own directory is never listed. **Db** is one
  connection with the memory adapter's queue, so a transaction is never interleaved; FTS5 is compiled into
  expo-sqlite by default on both platforms (`expo.sqlite.enableFTS` unset). **Kv** is `expo-sqlite/kv-store`
  in its own database file, so preferences need no MMKV.
- **ShareSheet** appends one line per provenance (`title · publisher/resource tag · licence`) that the text does
  not already carry.

### Not verified

- No adapter has run. On a phone, run `runPortContract` from `sim/adapters/contract.ts` against
  `createPlatformPorts` with an `http` fixture on `git.door43.org`, and record it here. In particular unverified:
  expo-file-system `move` onto a free path for a directory, `FileHandle` offsets, `adopt` from an Android
  `content://` URI, `Paths.availableDiskSpace`; expo/fetch manual redirects returning the 3xx with its
  `Location` on both platforms, body streaming, and `Range`; expo-sqlite blobs and FTS5 in a release build;
  expo-audio load and end events.
- Android file shares go through expo-sharing, which carries no text, so an audio file shared on Android has no
  provenance line (SH-5). iOS shares the file and the text together. Open for the Share task.
- expo-file-system's Android manifest merges `READ_EXTERNAL_STORAGE` and `WRITE_EXTERNAL_STORAGE` (max SDK 32);
  PRD section 7 allows storage only as the platform requires, so T13's `app.config` should block both unless
  file import needs them. expo-network adds `ACCESS_NETWORK_STATE` and `ACCESS_WIFI_STATE`; expo-audio adds
  `MODIFY_AUDIO_SETTINGS`. No location permission is added by any of them.
- Transport is unavailable on phones until `docs/proposals/2026-09-29-transport-radio.md` is decided.
- The template screen and the root layout were not rendered, in light, dark or reduced blur.

## 2026-09-29 F1 foundation review fixes

Node v22.22.2. Everything below ran in Node through Vitest, the sim, the checks and `expo export`; nothing
ran on a phone and no screen was rendered.

### Checks and scenarios observed red, then green

Each red below was provoked by a throwaway edit or file, reverted before the green run.

- lint: with the T4 eslint config and rules restored, the new boundaries.test.ts cases: "Tests 49 failed | 67 passed (116)" (device modules, app layers, @design-system, dot segments, import()/require/import type, fetch globals, Intl/localeCompare/Function/eval/queueMicrotask/import.meta/Math alias/WeakRef, .mts/.cts/.jsx). With the new config: 116 passed. Also the new lib-purity syntax rule found 9 real uses of localeCompare in src/lib (catalog/languages, catalog/normalize, migrate, packs/install, packs/packs) -> compareText in src/lib/order.ts.
- #5: events.test 'keeps names out of preferences, failure contexts and ids (DX-1)' against the T4 domain files: 'AssertionError: expected true to be false' (PreferenceChanged home.name value 'Jesse' accepted); green after preferences.ts, closed failure-context kinds and minted-id shape.
- #3: sim/kernel-reactions.test.ts "holds an emit made before start..." with `await loaded` removed from journal.append: FAIL (1 failed | 10 passed); green with the gate. Also INSERT OR REPLACE -> INSERT so a reused seq fails loudly instead of overwriting.
- #4: "never counts backwards when old events drop..." with telemetry folding from an empty baseline: FAIL; green with the checkpoint baseline.
- #9: "resolves an emit only after every observer..." with onEntry fire-and-forget: FAIL; green awaited.
- #11: "lets a module write only the tables, directories and preference keys it owns" with raw files/db/kv handed to modules: FAIL; green scoped.
- #4 DX-3: the new bounded case (limit 8, dropped 4) with telemetry folding from an empty baseline: 'FAIL DX-3 ... 2 !== 6'; green with the baseline carried in the export and resumed in replay.
- #12 archive limits: archive.test "refuses an archive that unpacks past its limits" is new API (limits param); with the T4 unzipSync reader the 4 MB-of-zeros entry in a <10 kB zip unpacked whole. Streaming reader (fflate Unzip + UnzipInflate) verified against a zip with data descriptors written by Python zipfile to a non-seekable stream (both entries read, 700 and 6000 bytes) and the fixture archives.
- #12 intake: SH-3 with importFile removed from the Packs API: 'FAIL SH-3 ... opened.kernel.packs.importFile is not a function'; green with Files.adopt + packs.importFile.
- #13/#14: validate.test with the T4 validate.ts and flavors.ts: 4 failed | 37 passed (provisional rows admitted by default; Academy without config.yaml accepted; ingredient keys ../metadata.json, README.md etc accepted; meta.version 0.2.0/2.0.0/latest accepted). Green after.
- #14 contract: with the tn fixture mapped to questions, `npm run contract` printed 'FAIL sb/unfoldingWord/qaa_tn/v1.zip: notes ... expected questions', 'contract: 20 fixture burritos, 1 failed'.
- #15: SH-3 went red once on the unified Provenance (released now part of provenance), expectation updated.
- #16 owns: with a throwaway migration creating `throwaway` and a throwaway src/lib/catalog/throwaway.ts holding 'INSERT INTO journal ...': `npm run checks` -> 'FAIL owns ... table throwaway is created by a migration and owned by no one' and 'src/lib/catalog/throwaway.ts writes journal, which kernel owns in src/lib/journal'. Removed; pass: 5 owners, 7 tables, 6 created by migrations.
- #16 network: with "axios" added to package.json dependencies (not installed): 'FAIL network ... axios opens connections itself ...' and '... no line in docs/dependencies.md'. Reverted; pass: 16 runtime dependencies, 582 locked production packages scanned.
- #16 provenance/strings: with empty src/lib/corpus and src/lib/strings directories: both FAIL ('src/lib/corpus exists, so this check must now run for real ...'). Removed.
- #16 typecheck: tsconfig.lib.json include pointed at nothing: 'typecheck tsconfig.lib.json: FAIL error TS18003: No inputs were found' (was 'pending' in T1). Reverted.
- #16 trace: a copy of HO-8 named HO-88.typo.ts: 'FAIL scenarios named for no Must requirement in docs/PRD.md: HO-88.typo.ts', exit 1. Removed. Trace now reports scenarios and test-only proof separately (12 with a scenario, 1 with a test only, 38 unproven).
- #17: with a throwaway app/_layout.tsx (expo-router Stack, importing @lib/order, @shared/glass and @shared/fonts) and app/index.tsx, `CI=1 npx expo export --platform android --output-dir <scratchpad>`: 'Android Bundled 9685ms node_modules/expo-router/entry.js (1458 modules)', Hermes bytecode bundle, all 18 design-system fonts emitted as assets; `--platform ios`: 'iOS Bundled 18021ms ... (1324 modules)'. So Metro and Babel handle "type": "module" and the tsconfig path aliases with no babel.config or metro.config. `npm run bundle` skipped with no app/, passed both platforms with a minimal app/, and failed both with 'Unable to resolve module @lib/does-not-exist' when the layout imported a missing alias. Throwaway files removed.
- #18: pressGate.test 'goes inert synchronously ...' with the gate never marking itself pending: FAIL (1 failed | 2 passed); green after. Glass rendering was not run (no device, no react-native-web harness): the gate, hitSlop and minHeight are unverified on screen.
- minor Jude 5: reference.test with the T4 parser: 1 failed | 5 passed ('Jude 5' refused); green after (a bare number above 1 in a one-chapter book is a verse; 'JUD 1' stays the chapter).
- minor css-tokens: css-tokens.test 'refuses an at-rule it does not read' with the T9a parser: FAIL; green after, and the real tokens still pass.

`npm run verify` then returned green (exit 0): 26 test files, 330 tests; `5 checks, 2 pending, none failed`
(owns and network now run for real; provenance and strings fail as soon as `src/lib/corpus` and
`src/lib/strings` exist); `sim: 12 scenarios, 12 passed, 0 failed`; `trace: 51 Must requirements, 12 with a
scenario, 1 with a test only, 38 unproven`; `contract: 20 fixture burritos, 0 failed` (live skipped, offline);
`bundle: skipped, app/_layout.tsx does not exist yet`.

### What later tasks must follow

- A module's `ctx.ports` is scoped: the clock has `dayOf` only; `ids.next()` throws on a second mint before an
  event carries the first, and `emit` throws on an event that drops it; `db`, `files`, `kv` and
  `http.download` refuse writes outside the module's `owns` with `kernel.not-owned`; audio URLs go through the
  host allowlist. Reads are not scoped.
- `observe(entry)` may be async and is awaited by the `emit` that appended the entry; it never sees entries
  reloaded at start, so a module rebuilds from its own tables in `start`. A thrown reaction becomes
  `Failure { code: 'kernel.observer-failed', context: { observer, type, cause } }`.
- A module may declare `checkpoint: { initial, step }`, a fold the journal applies to the events it drops; the
  module reads it through `ctx.baseline()`. The journal export is version 2 and carries `baseline`.
- A Failure context is a closed record (`failureContextKinds`); a new key or step is a line in
  `src/lib/domain/failures.ts`. An `id` field takes only a minted id. `PreferenceChanged.key` comes from
  `src/lib/domain/preferences.ts`; T8 adds its keys there.
- Files: `readRange`, `appendBytes`, `adopt(external, path)`. Http: `cancel` token (`createCancellation` in
  `src/lib/cancel.ts`), `resumeFrom` on downloads, a `cancelled` outcome and a required final `url` on every
  response. T9's platform Http must report the URL it landed on after redirects (the guard refuses one off the
  allowlist); T9's Files must implement the three new methods, `adopt` copying from a `file://` or
  `content://` URI the system handed over.
- `validate` admits only `pinnedRows` unless handed rows; runtime code uses `packRows`, fixtures `fixtureRows`.
- `kernelModules` gains one line per module until the scaffold PR merges (`docs/exceptions.md`), with the pin
  in `sim/kernel.test.ts`.
- T8 adds `--enforce` to the trace script; trace already fails on a scenario named for no Must requirement.
- Migrations apply in code-point order of their ids (`compareText`), whatever the host locale.

### Not verified

- Nothing ran against a platform adapter; the streaming archive read is proven on fixture archives and one
  zip with data descriptors, not on a go-rc2sb release (the network to git.door43.org is blocked here).
- The Packs download still lands the whole archive through `Http.download` and decompresses kept files into
  memory; only the archive bytes are now read in 1 MiB ranges. Streaming the download itself and writing each
  entry as it inflates is a follow-up for the platform adapters.
- The glass press gate, hitSlop, GlassInput growth and the hidden decorative drawings were not rendered in
  light, dark or reduced-blur, and not tried with a screen reader.
- Android `GlassBlur` still needs a `BlurTarget` ancestor (an `AuroraField`) to blur; T10 must place one.
- `docs/architecture.md` still lists `StepCompleted`; the code and tests say `MovementCompleted`, the
  CONTEXT.md word. The architecture doc needs a human edit.
- Device discovery by reserved filename (stores, services, migrations) will need Metro's `require.context`
  in `src/platform`, which the static-import lint rule leaves open there; not yet written.
## 2026-09-29 T7a strings

Node v22.22.2 (ICU 78.2). Everything below ran in Node through Vitest and `npm run checks`; nothing ran on a
phone, and no screen exists yet to render a string.

### The strings check, observed red once

One throwaway run broke each rule at once: `common.close` deleted from `es-419.ts`, `{language}` renamed
`{idioma}` there, the `many` form of `home.download.ready` removed, `state.upToDate` in English rewritten as
`Everything is up to date — unfoldingword & more!`, and a throwaway `src/features/red/screens/RedScreen.tsx`
holding JSX text, a literal `accessibilityLabel` and a prose constant. `npm run checks` printed:

```
FAIL     strings: Every locale lists every key, the copy follows the voice rules, and no literal copy in app/, src/features/ or src/shared/ bypasses the string table
         en: state.upToDate has an exclamation mark
         en: state.upToDate has an em dash
         en: state.upToDate writes unfoldingword; the name is unfoldingWord
         en: state.upToDate uses &; spell out and
         es-419: common.close is missing; write a translation or null
         es-419: state.notDownloaded.action uses {idioma}, which English does not
         es-419: home.download.ready needs the plural forms many
         src/features/red/screens/RedScreen.tsx:2 has the literal "Choose your language"; use onboarding.choose
         src/features/red/screens/RedScreen.tsx:2 has the literal "Try this now"; add it to src/lib/strings
         src/features/red/screens/RedScreen.tsx:4 has the literal "Continue in English"; use onboarding.english
```

The first version of the scan crashed on that run (`node.parent` is undefined on the source file); fixed before
the run above. The throwaways were reverted and the check returned
`pass strings: 402 keys in 16 locales (... every locale 402/402); 33 screen and shared files hold no literal copy`.
A missing failure-code string is refused by the type of `src/lib/strings/en/failures.ts` before the check runs.

Tests at the interface were observed red by two throwaway edits, reverted: the English fallback removed from
`t` (`expected 'nav.study' to be 'Study'`) and `es` mapped to `en` in `resolveLocale`
(`expected 'en' to be 'es-419'`).

`npm run verify` then returned green (exit 0): 24 test files, 255 tests; `5 checks, 3 pending, none failed`;
`sim: 12 scenarios, 12 passed, 0 failed`; `trace: 51 Must requirements, 13 proven, 38 unproven`;
`contract: 20 fixture burritos, 0 failed` (live skipped, offline).

### Not verified

- All fifteen translations are machine-authored and unreviewed; `docs/strings-review.md` lists what needs a
  native speaker. Complete means every key has a value, not that the value is right.
- Plural selection uses `Intl.PluralRules`. Hermes' documented Intl coverage does not list `PluralRules`
  (inference from its documentation, not run on a device); if it is absent on the phone, the platform layer
  must install a polyfill such as `@formatjs/intl-pluralrules` before the kernel starts, or `plural` throws.
- The check's plural categories come from Node's ICU; a different ICU on a device could select a category the
  table does not carry, in which case `plural` uses the `other` form.
- No RTL layout, Nastaliq line height or Burmese shaping was rendered.
- No screen calls the table yet, so which keys are unused is not checked.

## 2026-09-29 T4 catalog and packs

Node v22.22.2. Everything below ran in Node through the sim and Vitest; nothing ran on a phone.

### Scenarios observed red, then green

The Catalog and Packs internals were drafted before the scenarios were run, so the first red run was against
the kernel with `catalog` and `packs` left out of `kernelModules`: `sim: 12 scenarios, 1 passed, 11 failed`,
each with `Cannot read properties of undefined (reading 'refresh')` (LA-1: `reading 'languages'`). Each
scenario was then observed red against the behaviour it guards, by a throwaway edit reverted before the green run:

| Scenario | Regression | Observed |
|---|---|---|
| `LA-2.language-pack-all-text` | `comparePublishers` sorts publishers plainly | `FAIL ... unfoldingWord is listed first` (`Door43-Catalog` came first) |
| `LA-2`, `LA-6`, `LA-7` | First draft left `packs/.staging/` and `packs/.old/` behind | `FAIL ... nothing is left staged`; fixed by clearing both after every install |
| `LA-6.storage-sizes-remove` | First draft listed storage in install order | `FAIL ... Expected values to be strictly deep-equal` (`language:qaa` before `image:obs`) |
| `LA-7.update-opt-in-atomic` | `swapIn` does not move the old pack back when the move of staging fails | `FAIL ... files.not-found: packs/language/qaa/unfoldingWord/qaa_tn/ingredients/tn_RUT.tsv does not exist` |
| `LA-7.update-opt-in-atomic` | `recoverPacks` never restores `packs/.old/{id}` | `FAIL ... a pack moved aside when the app stopped is restored on start` |
| `DX-3.replay-rebuilds-snapshot` | No redo handler for `PackInstallStarted` | `FAIL ... Expected values to be strictly deep-equal` on the divergence list |
| `SH-3.import-burrito-file` | Every file under `ingredients/` kept, listed or not | `FAIL ... a file the metadata does not list is not installed` |

Tests at the interfaces also found one defect: two quick calls to `installFromCatalog` both installed the whole
pack, because what was missing was decided before the install queue (`sim/packs.test.ts`, "serializes
installs", received `install: "id-000002"`). The decision now happens inside the queue.

`npm run verify` then returned green (exit 0): 22 test files, 234 tests; `5 checks, 4 pending, none failed`;
`sim: 12 scenarios, 12 passed, 0 failed`; `trace: 51 Must requirements, 13 proven, 38 unproven`;
`contract: 20 fixture burritos, 0 failed` (live skipped, offline).

### Changed beyond the new files

- `sim/adapters/files.ts`: `rename` now refuses an existing target, as expo-file-system's move does, and
  `failRename(prefix)` scripts one refused rename. The pack swap moves the current pack to `packs/.old/`, moves
  staging in, and deletes the old copy; on start, a pack missing from `packs/` with a copy under `packs/.old/`
  is restored, staging and `.old` are removed, and a pack directory the database never recorded is removed.
  Only the adapter's own test relied on replace-on-rename.
- `sim/adapters/http.ts`: `hold(prefix)` keeps matching requests waiting until released (ON-2 progress).
- `sim/world.ts` serves every fixture route by default; `world.fixtures.publish(publisher, resource, tag)`
  serves a newer release and a catalog that lists it (HO-8, LA-7). `sim/fixtures/archive.ts` is split out of
  `generate.ts` so `publish` builds an archive with the same function as `npm run fixtures`; the fixtures test
  still rebuilds the checked-in bytes exactly.
- `sim/peer.ts` is a fixture `PeerSession` standing in for T7's Transport.
- `src/lib/domain/events.ts`: a bounded list-of-records field kind; `PackInstallStarted.releases`,
  `PackInstalled.burritos`, and `PackInstallProgressed` (follows, at most ten per install).
- `src/lib/domain/release.ts`: `releaseKey` is `{publisher}/{resource}@{tag}`, since a resource is the DCS
  name, which already carries the language (`qaa_ult`); nothing called it before.
- `eslint.config.ts` and `.prettierignore` ignore `.claude/`: the parallel T5 worktree's files turned lint red.
- `scripts/checks/owns.check.ts` still pending for T8; kernel modules are checked by a test in
  `sim/kernel.test.ts` (every created table has one owner, no table or directory claimed twice).

### Not verified

- Nothing ran against expo-file-system, expo-sqlite or the network. The swap assumes the platform move fails
  on an existing target and that `mkdir` is idempotent with intermediates; T9's adapters must hold to that.
- The DCS catalog's paging: the module follows `page=2..` while `X-Total-Count` says there are more, which is
  how Gitea pages; whether `catalog/search` without `limit` returns every entry is unverified from here.
- Whether go-rc2sb writes the tag in `identification.primary.dcs`: for catalog installs the catalog entry is
  the provenance authority, so a burrito without it still installs; a file or peer burrito without it is refused.
- The catalog carries no size, so `bytes` on a catalog release is always undefined and the free-space check
  before writing only applies to peer and file sources; a full disk during a download fails as `pack.no-space`.
- A crash after the swap but before the database write leaves new files under an old row; start does not
  reconcile the two.
- English names come from a table in `src/lib/catalog/languageNames.ts`, because Hermes has no
  `Intl.DisplayNames` (inference from Hermes' documented Intl coverage, not run on a device).

## 2026-09-29 T5 Corpus

Node v22.22.2. Everything below ran in Node through the sim and Vitest; nothing ran on a phone, and nothing
ran against expo-sqlite or expo-file-system.

### Scenarios observed red, then green

| Scenario | First red | Red against the behaviour | Green |
|---|---|---|---|
| `ST-2.passage-with-attached-helps` | Written before `src/lib/corpus` existed; `npm run sim -- all` printed `FAIL ... Cannot read properties of undefined (reading 'describe')` for ST-2 to ST-9 (`sim: 10 scenarios, 2 passed, 8 failed`) | With `attachQuote` returning no spans, `npm run sim -- ST-2` printed `FAIL ... Expected values to be strictly deep-equal: + [] - [ 'your', ...` | `npm run sim -- all`: pass |
| `ST-3.literal-and-simplified-toggle` | Same run | With `availableTexts` returning every reading found, `npm run sim -- ST-3` printed `FAIL ... no toggle when only one reading exists + [ 'literal' ] - []` | pass |
| `ST-4.audio-available-for-passage` | Same run | | pass |
| `ST-5.corpus-counts-per-resource-type` | Same run (`reading 'summary'`) | | pass |
| `ST-6.article-links-resolve` | Same run | | pass |
| `ST-7.original-language-plain-text` | Same run | | pass |
| `ST-8.reference-and-title-search` | Same run | The first implementation matched titles anywhere in a word: `FAIL ... + { id: 'tw/bible/kt/truth' }` for the query `ruth`; title search now matches at word starts only | pass |
| `ST-9.full-text-index-opt-in` | Same run | With the storage estimate factor at 1, `npm run sim -- ST-9` printed `FAIL ... built 13194 within the estimate 9552` | pass |

Each regression was reverted before the green run.

### Checks observed

| Check | Observed |
|---|---|
| Provenance on every content value (red) | With the Questions provenance given the licence `All rights reserved` in `src/lib/corpus/passage.ts`, `npm run checks` printed `FAIL provenance: ...` then `qaa literal RUT 1.questions[0]: provenance names no CC BY-SA 4.0 licence (All rights reserved)` and one line per question |
| Provenance on every content value (green) | `pass provenance: 60 corpus values rendered from every fixture pack, 164 pieces, each with a CC BY-SA 4.0 licence` |

### Decisions taken here, with their evidence

- Full-text search uses SQLite FTS5. `node:sqlite` in Node v22.22.2 created and queried an `fts5` table.
  expo-sqlite 57.0.3 (the package tarball, not a device) compiles `-DSQLITE_ENABLE_FTS5=1` on Android
  (`android/build.gradle`) and iOS (`ios/ExpoSQLite.podspec`) unless `expo.sqlite.enableFTS` is `false`.
- usfm-js is not used: no type declarations and no `@types/usfm-js` (`docs/dependencies.md`).
- The migration is `migrations/0100-corpus.ts`, numbered away from the Packs migrations.

### Changed beyond `src/lib/corpus`

- `src/lib/kernel.ts` gains one line, `corpus: corpusModule`, and `src/lib/domain/failures.ts` gains the code
  `corpus.unreadable`. `sim/kernel.test.ts` now lists the two modules and uses `InvitationShown` (still unowned)
  as its unhandled event, since Corpus now owns `StoryOpened`.
- `scripts/checks/provenance.check.ts` is no longer pending.

### Not verified

- No Corpus path has run on a phone or against expo-sqlite; FTS5 on a device is inferred from the package's
  build flags only.
- Corpus has not yet read a pack that Packs installed. The sim writes fixture burritos to the Files port itself
  (`sim/corpus-fixtures.ts`) and calls `ingest`; the `PackInstalled` and `PackRemoved` wiring is left for the merge.
- Alignment attachment matches each quoted original word by its occurrence, which is exact for single-word
  quotes and an approximation for multi-word quotes in which a word repeats. It has run only on fixture
  alignment, not on a real aligned literal text.
- The parsers have run only on fixture content and on the hand-written cases in the tests, not on a full real release.

## 2026-09-29 T2 domain, ports, memory adapters, journal, kernel, sim skeleton

Node v22.22.2. Everything below ran in Node through the sim and Vitest; nothing ran on a phone.

### Scenarios observed red, then green

| Scenario | First red | Red against the behaviour | Green |
|---|---|---|---|
| `DX-1.journal-bounded-append-only` | Written before any implementation; `vitest run sim` failed to load `./scenario` (nothing existed yet) | With trimming disabled in `src/lib/journal/journal.ts`, `npm run sim -- DX-1` printed `FAIL ... Expected values to be strictly equal: 9 !== 8` on the journal size (the database still trimmed, so each restart reloaded 8 and appended a ninth) | `npm run sim -- all`: pass |
| `DX-3.replay-rebuilds-snapshot` | Same run, same missing modules | With the playback clock removed from `sim/replay.ts`, `npm run sim -- DX-3` printed `FAIL ... Expected values to be strictly deep-equal`: every replayed event was stamped at the world's current time and the days of use collapsed to one | `npm run sim -- all`: pass |

Both regressions were reverted and `npm run verify` returned green: 11 test files, 110 tests; `sim: 2
scenarios, 2 passed, 0 failed`; `trace: 51 Must requirements, 2 proven, 49 unproven` (DX-1 and DX-3).

`npm run replay -- journal.json` on a journal exported from a two-day sim device printed the rebuilt
snapshot and `replay: the rebuilt journal matches the recorded one event for event` (exit 0). A document with
the wrong format printed `is not a journal: not a unfoldingword-journal document of version 1` (exit 1).

### Changed beyond the new files

- `.gitignore` ignores `.claude/`: the untracked agent worktrees under it made `knip` report 184 unused files.
- `knip.config.ts`: scenarios and migrations are entries, since they are loaded by discovery;
  `ignoreExportsUsedInFile` so a type used by its own file's functions is not reported.
- `tsconfig.lib.json` includes `migrations/**`, so migration files are checked with no DOM or Node types.
- `scripts/eslint/boundaries.ts` gains a `migrations` layer (only `import type` from `@lib/ports`), with cases in
  `boundaries.test.ts`; `docs/exceptions.md` records the sim loading migration files by path.

### Not verified

- No platform adapter exists yet, so nothing here ran against expo-sqlite, expo-file-system or a radio. The
  memory Db runs on `node:sqlite`, which prints an experimental warning in Node 22.
- Replay covers `AppOpened` and verbatim events end to end; `redo` handlers for the other events arrive with
  the modules that own them (T4 to T8), under the contract in `docs/replay.md`.
- Telemetry and days of use are folds over the retained journal, so they undercount once the journal has
  dropped events (the default limit is 5000).
## 2026-09-29 T3 burrito validator and fixture burritos

Node v22.22.2. `npm run fixtures` wrote 23 files, 132011 bytes: 20 burrito archives under `sim/fixtures/sb/`,
`catalog.json`, `languages.json` and `routes.json`.

### Checks observed

| Check | Command | Observed |
|---|---|---|
| Content matches the contract (red) | `npm run contract` (exit 1) after a throwaway script rewrote `sim/fixtures/sb/unfoldingWord/qaa_tn/v1.zip` with a zeroed md5 for `ingredients/tn_RUT.tsv` | `FAIL  sb/unfoldingWord/qaa_tn/v1.zip: invalid ingredient-checksum at ingredients/tn_RUT.tsv: ingredient ingredients/tn_RUT.tsv has md5 07b2768a4dd4f74daabfbb37a99cadac, listed as 00000000000000000000000000000000` / `contract: 20 fixture burritos, 1 failed` |
| Fixtures rebuild byte for byte (red) | `npx vitest run sim/fixtures` with the same corrupted archive | `× rebuild to exactly the checked-in bytes, with nothing stale left on disk` and `× serve every release through a route, and every route resolves to a valid burrito` |
| Content matches the contract (green) | `npm run fixtures`, then `npm run contract` | 20 `ok` lines, one per burrito with its row; `contract: 20 fixture burritos, 0 failed` |
| Deterministic across time zones | `TZ=Pacific/Kiritimati` and `TZ=America/Los_Angeles npx vitest run sim/fixtures` | `Tests  5 passed (5)` both times |

The throwaway script was deleted and the archive regenerated before the green run.

### Not verified

- The live half of `npm run contract` has never reached `git.door43.org`: from this environment the request is
  refused (`live: skipped, offline (HTTP 403 ...)`). The first online run (CI) is the first comparison of the
  pinned rows, the provenance fields and the story-helps rule against real `go-rc2sb` output, and it fails verify
  if they disagree.
- The fixture catalog, language list and route shapes are reconstructed from knowledge of the DCS API, not
  captured from it.
- The fixture JPEG (8x8 grey baseline) and MP3 (silent MPEG-1 Layer III frames) bytes were built by hand and never
  decoded by an image or audio decoder; no decoder is available here.
- The provisional flavors (`docs/proposals/2026-09-29-provisional-flavors.md`) await human approval.
## 2026-09-29 T9a theme, fonts and glass primitives

`src/shared/theme` mirrors every custom property in `design-system/tokens/*.css` by its CSS name
(`tokens.ts`: 193 `:root` tokens, 55 `[data-theme="dark"]` overrides, 3 `prefers-reduced-motion` overrides,
6 keyframes), and `createTheme({ scheme, reducedBlur, reducedMotion })` resolves them into React Native values
under camel-cased names (`--glass-fill-2` is `theme.color.glassFill2`, `--shadow-card` is
`theme.shadow.shadowCard`). `src/shared/fonts` mirrors the 18 `@font-face` rules. `src/shared/glass` holds the
ten primitives. Deviations from the `.d.ts` props and the non-token values copied from the reference `.jsx`
are in `docs/exceptions.md`.

`npm ci` failed at `f7dddbb` with ERESOLVE: nothing pinned `react-dom`, npm resolved 19.3.0, and that wants
react ^19.3.0 against the pinned 19.2.3. Pinning `react-dom` 19.2.3 (the SDK 57 bundled version) fixed it;
`rm -rf node_modules && npm ci` then completed.

### Checks observed red once

| Check | Command | Throwaway | Red output (excerpt) |
|---|---|---|---|
| Tokens agree | `npm run checks` (exit 1) | In `src/shared/theme/tokens.ts`: `--glass-fill-2` changed to `.5`, `--blur-heavy` deleted, `--r-throwaway` added; in `src/shared/fonts/faces.ts`: Inter Regular weight `450` | `FAIL tokens` / `:root: missing --blur-heavy` / `:root: extra --r-throwaway, not in design-system/tokens` / `:root: --glass-fill-2: tokens say 'rgba(255,255,255,.46)', theme says 'rgba(255,255,255,.5)'` / `@font-face: missing Inter \| Inter-Regular.ttf \| 400 ...` / `@font-face: extra Inter \| Inter-Regular.ttf \| 450 ...` |

Both files were restored and the check passed: `pass tokens: 193 tokens, 55 dark overrides, 3 reduced-motion
overrides, 6 keyframes and 18 font faces agree`. The face key format was tidied after the red run. The check
also fails when a face names a file missing from `design-system/assets/fonts`.

### What the tests cover

In Node (`vitest`): every token resolves in both schemes with no `var()` left; every token has a category and
a derived value under its camel-cased name; dark re-points only the aliases; reduced-blur mode zeroes every
blur step and leaves every other value equal; reduced motion shortens `--dur-base`, `--dur-slow` and
`--dur-morph`; px, em, ms, cubic-bezier, border, shadow and font shorthand conversions; text roles pick the
shipped face (`--type-hero` is `InterDisplay-Medium` 28/32.48, -0.56 letter spacing); Noto faces for Arabic,
Urdu and Bengali; keyframe parsing and timelines; the DotRing and Filament geometry against the reference
formulas; shadow splitting into outer and inset layers. The primitives themselves are type-checked, not
rendered.

### Not verified

- Nothing was rendered. No primitive has been seen on a phone, a simulator or react-native-web, in light,
  dark or reduced-blur mode, at 360 px, at maximum dynamic type or in right-to-left. T10 renders them.
- React Native 0.86 accepts `boxShadow` strings (outset and inset) and `experimental_backgroundImage` linear
  and radial gradients by its type definitions and its style parsers (read in `node_modules`); the token
  strings were not run through those parsers.
- Blur: `expo-blur` takes an intensity from 0 to 100, not a radius. The ladder maps linearly onto
  `--blur-heavy` (8, 16, 24, 40, 64 px give 13, 25, 38, 63, 100). The `systemUltraThinMaterial` tints are the
  least tinted iOS materials but still tint. `saturate(160%)` has no React Native equivalent and is dropped.
  On Android the blur samples only the AuroraField backdrop (`BlurTargetView`), and only on Android 12 and
  later; older Android renders the flat fill, which is the reduced-blur look. None of this was seen.
- The aurora's `filter: blur(28px)` in the reference `AuroraField.jsx` is not applied; the radial gradients
  already fade to zero. Not compared side by side.
- Fonts: `useThemeFonts()` loads each face under its file name. Whether Metro resolves the
  `@design-system/assets/fonts/*` alias for `.ttf` assets, and whether `fontWeight` selects weights inside the
  variable Nunito Sans and Noto files on iOS and Android, is unverified.
- `StatusBar` needs a `SafeAreaProvider` above it; the app layout (T10) provides it.

## 2026-09-29 T1 toolchain and checks

Node v22.22.2, npm 10.9.7, Expo SDK 57.0.26 (current `latest` on npm). `npx expo install --check` could not
reach the Expo API from this environment; with `EXPO_OFFLINE=1` it reported "Dependencies are up to date"
against the SDK's bundled module list, and warned that offline validation is unreliable.

### Checks observed red once

Each was provoked with a throwaway file, observed failing with a non-zero exit, then the file was removed and
`npm run verify` returned green.

| Check | Command | Throwaway | Red output (excerpt) |
|---|---|---|---|
| Imports go down the tower (alias) | `npx eslint src sim` | `src/lib/throwaway-alias.ts` importing `@features/home/service` | `'@features/home/service' import is restricted from being used by a pattern. src/lib imports nothing above it in the tower (AGENTS.md rule 2)  @typescript-eslint/no-restricted-imports` |
| Imports go down the tower (package) | `npx eslint src sim` | `src/lib/throwaway-rn.ts` importing `react-native` | `'react-native' import is restricted from being used by a pattern. React, React Native and Expo stay out of this layer (AGENTS.md rule 2)` |
| Imports go down the tower (relative path) | `npx eslint src sim` | `src/features/home/throwaway-relative.ts` importing `../study/service` | `'../study/service' leaves src/features/home. Import across units by alias (@lib, @features, @shared, @platform, @sim) so the boundaries in AGENTS.md rule 2 apply  uw/relative-imports-stay-in-unit` |
| lib is pure (globals) | `npx eslint src sim` | `src/lib/throwaway-globals.ts` using `Date.now()` and `Math.random()` | `Unexpected use of 'Date'. src/lib reaches this through the Clock port (AGENTS.md rule 2)  no-restricted-globals`; `'Math.random' is restricted from being used. src/lib reaches this through the Ids port  no-restricted-properties` |
| lib is pure (no DOM, no Node types) | `npm run typecheck` (exit 1) | `src/lib/throwaway-dom.ts` reading `document.title` and `process.argv` | `typecheck tsconfig.lib.json: FAIL` / `error TS2584: Cannot find name 'document'` / `error TS2591: Cannot find name 'process'` |
| No code comments | `npx eslint src sim` | `sim/throwaway-comment.ts` with a line comment | `1:1  error  Code carries no comments (AGENTS.md section 10). Move what this says into a name, a type, a test or docs/  uw/no-comments` |
| No `any` | `npx eslint src sim` | `src/shared/throwaway-any.ts` | `1:22  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any` |
| Files under 1000 lines | `npx eslint src sim` | `src/shared/throwaway-long.ts`, 1000 lines | `1000:1  error  File has too many lines (1000). Maximum allowed is 999  max-lines` |
| Format | `npm run format:check` (exit 1) | `scripts/throwaway-format.ts` | `[warn] scripts/throwaway-format.ts` / `[warn] Code style issues found in the above file.` |
| Nothing unused | `npx knip` (exit 1) | `src/shared/throwaway-orphan.ts`; an unused export in `scripts/checks/throwaway-helper.ts` | `Unused files (1) src/shared/throwaway-orphan.ts` / `Unused exports (1) unusedExport  scripts/checks/throwaway-helper.ts:2:14` |
| Custom check runner | `npm run checks` (exit 1) | `scripts/checks/throwaway.check.ts` returning a failure | `FAIL     throwaway: a check that always fails` / `6 checks, 5 pending, some failed` |
| Every Must requirement is proven | `npm run trace -- --enforce` (exit 1) | none; nothing is proven yet | `trace: 51 Must requirements, 0 proven, 51 unproven` |
| Sim refuses to pretend | `npm run sim -- all` (exit 1) | `sim/scenarios/DX-1.throwaway.ts` | `sim: scenarios exist but the scenario runner is pending (T2); nothing was run` |

The same boundaries are held by `scripts/eslint/boundaries.test.ts`, which lints snippets through the real
config: every rule-2 layer refusing an alias and a relative path, the allowed imports passing, the lib globals,
the no-comments rule (including `/* eslint-disable */`, which `noInlineConfig` makes powerless), `any` and
`max-lines`.

### Checks still pending

These report `pending` and pass until the code they check exists.

| Check | Where | Awaiting |
|---|---|---|
| One writer per durable value (`owns`) | `scripts/checks/owns.check.ts` | T4 kernel tables and pack directories, T8 feature `store.ts` |
| Tokens agree | `scripts/checks/tokens.check.ts` | T9 `src/shared/theme` |
| Strings live in one table | `scripts/checks/strings.check.ts` | T7 Strings module, T8 feature `strings.ts` |
| Provenance on every content value | `scripts/checks/provenance.check.ts` | T3 fixtures, T5 Corpus |
| No network except allowlisted hosts (dependency scan) | `scripts/checks/network.check.ts` | T9 `src/platform/http.ts` |
| Every Must requirement is proven | `scripts/trace/cli.ts` reports; `--enforce` fails | T8 adds `--enforce` to the `trace` script |
| Content matches the contract | `scripts/contract.ts` | T3 validator and fixture burritos |
| Scenarios and replay | `sim/cli.ts` | T2 kernel, journal and scenario runner |
| Typecheck of `tsconfig.json` and `tsconfig.lib.json` | `scripts/typecheck.ts` reports "pending, no source files yet" | the first file under `src/` |

### Not verified

- Nothing ran on a phone or through Metro; no `app/` route or `app.config` exists yet.
- The GitHub Actions workflow was written, not run.
- `npm audit` reports 13 moderate advisories, all transitive through Expo's CLI and config tooling (`uuid`,
  `decode-uri-component`, `query-string`, `xcode`). Left as they are; the fix requires leaving SDK 57's pins.
