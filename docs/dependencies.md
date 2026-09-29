# Dependencies

One line per direct dependency: what it replaces (AGENTS.md section 6). The PR description is built from this
list. Versions live in `package.json`; the lock file is committed.

## Runtime

| Package | Version | Replaces |
|---|---|---|
| expo | ~57.0.26 | A hand-built React Native toolchain, native project maintenance and build tooling (SDK 57, current stable on 2026-09-29) |
| react | 19.2.3 | Nothing; the view layer React Native requires, pinned to the version Expo SDK 57 bundles |
| react-native | 0.86.3 | Separate Swift and Kotlin apps; pinned to the version Expo SDK 57 bundles |
| expo-router | ~57.0.24 | A hand-written navigation registry; file-based routes under `app/` |
| expo-constants | ~57.0.20 | Reading app configuration by hand; a required peer of expo-router |
| expo-linking | ~57.0.11 | Hand-parsed deep links; a required peer of expo-router |
| react-native-screens | ~4.26.0 | JavaScript-only screen containers; a required peer of expo-router |
| react-native-safe-area-context | ~5.7.0 | Hand-measured notch and inset padding; a required peer of expo-router |
| fflate | ^0.8.3 | A hand-written zip reader and writer for burrito archives in `src/lib/burrito`; pure JavaScript, typed, runs on Hermes and in Node |
| @noble/hashes | ^2.4.0 | A hand-written MD5 for burrito ingredient checksums (`legacy.js`); pure TypeScript, audited, no native code |
| react-dom | 19.2.3 | Nothing; pins the React DOM peer to the version Expo SDK 57 bundles. Without it npm resolved react-dom 19.3.0, which wants react ^19.3.0, and `npm ci` failed with ERESOLVE |
| expo-blur | ~57.0.3 | Hand-written native blur views; the backdrop blur under every glass surface (UIVisualEffectView on iOS, BlurView on Android 12 and later) |
| expo-font | ~57.0.4 | Hand-registered native font files; loads the bundled Inter, Nunito Sans, PT Serif and Noto faces at start-up |
| expo-haptics | ~57.0.3 | Native vibration code; the light impact on press |
| react-native-svg | 15.15.4 | Hand-drawn views for DotRing and Filament; also the renderer lucide-react-native draws with |
| lucide-react-native | ^1.48.0 | The Lucide path data inlined in `design-system/components/icons/Icon.jsx`; the same outlines as components, ISC licence |
| marked | ^18.0.14 | A hand-written Markdown parser for Words, Academy, notes and movements in `src/lib/corpus`; only its lexer is used, and Corpus maps the tokens to its own typed blocks, so no HTML is produced. MIT, typed, no dependencies, pure JavaScript for Node and Hermes |
| yaml | ^2.9.1 | A hand-written YAML reader for Academy `config.yaml` and `toc.yaml` in `src/lib/corpus`. ISC, typed, no dependencies, pure JavaScript |
| expo-file-system | ~57.0.7 | Hand-written native file access; the Files platform adapter (`File`, `Directory`, `FileHandle` for ranges, copy from a system `file://` or `content://` URI) |
| expo-sqlite | ~57.0.3 | A hand-bound SQLite; the Db platform adapter (FTS5 compiled in by default) and, through `expo-sqlite/kv-store`, the Kv adapter, so preferences need no second native module such as MMKV |
| expo-crypto | ~57.0.3 | A hand-written random UUID; Hermes has no `crypto.randomUUID`, so the Ids adapter uses `randomUUID()` from the platform's secure random source |
| expo-network | ~57.0.2 | Hand-written reachability checks; the Http adapter's offline signal (`getNetworkStateAsync`). It makes no network calls of its own; the adapter never calls its IP address function |
| expo-audio | ~57.0.5 | A hand-written player; the Audio adapter streams an allowlisted URL or plays a downloaded file |
| expo-sharing | ~57.0.22 | A hand-written Android share intent for files; the ShareSheet adapter shares an audio file on Android (text and iOS files go through React Native's `Share`) |
| expo-localization | ~57.0.2 | Reading the device locale by hand; the Locale adapter's tag, region, time zone and direction |

## Development

| Package | Version | Replaces |
|---|---|---|
| typescript | ~6.0.3 | Untyped JavaScript; the version the Expo SDK 57 template pins (typescript-eslint supports below 6.1) |
| @types/react | ~19.2.2 | Hand-written React type declarations |
| @types/node | ^22.20.4 | Hand-written Node declarations for `sim/` and `scripts/` (Node 22 is the CI runtime) |
| eslint | ^10.11.0 | Import boundaries, lib purity and the no-comments rule checked by review instead of by the build |
| @eslint/js | ^10.0.1 | Hand-picking ESLint's recommended core rules |
| typescript-eslint | ^8.71.0 | A separate TypeScript parser and rule set; also supplies `no-restricted-imports` with type-only allowances |
| prettier | ^3.9.9 | Formatting by review |
| vitest | ^5.0.2 | Jest; runs tests and scenarios in plain Node with ES modules and TypeScript |
| knip | ^6.38.0 | Hand audits for unused files, exports, types and dependencies |
| tsx | ^4.23.15 | A compile step before running `sim/` and `scripts/` in Node; resolves the tsconfig path aliases |

## Evaluated and not taken

| Package | Considered for | Why not |
|---|---|---|
| usfm-js 3.5.0 (unfoldingWord) | USFM with alignment in `src/lib/corpus` | none: usfm-js rejected because it ships no type declarations and there is no `@types/usfm-js` (AGENTS.md section 6 asks for typed packages); it is ISC and was released on 2026-05-23, so it is otherwise eligible. `src/lib/corpus/usfm.ts` is a minimal reader of what the app shows: books, chapters, verses, words and their `\zaln` alignment |
| tsv-groupdata-parser 1.1.1 (unfoldingWord) | Notes, Word Links and Questions TSV | none: tsv-groupdata-parser rejected because it turns Translation Notes TSVs into translationCore group indexes and group data, not the verse helps the app shows, and ships no type declarations. `src/lib/corpus/tsv.ts` splits the table by its header names |
| make-plural 8.1.0 | CLDR plural rules for Strings in `src/lib/strings` | none: make-plural rejected because every current release (7.x and 8.x) is licensed Unicode-DFS-2016, which is permissive but not one of the licences AGENTS.md section 6 names. The sixteen locales need six rule shapes, so `src/lib/strings/plural.ts` holds them as data, and `scripts/checks/plural.test.ts` checks every one against the ICU in Node over 2,400 integers, round millions and decimals. Hermes may lack `Intl.PluralRules`, so the table also keeps the phone and the sim in agreement |
