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
