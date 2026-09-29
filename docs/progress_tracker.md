# Progress tracker

What actually ran, append-only, newest first. Each entry says what was run, what was observed, and what was
not verified.

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
