# Progress tracker

What actually ran, append-only, newest first. Each entry says what was run, what was observed, and what was
not verified.

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
