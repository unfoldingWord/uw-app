# Progress tracker

What actually ran, append-only, newest first. Each entry says what was run, what was observed, and what was
not verified.

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
