# Let the device CI build offer the drafted locales

Status: approved in issue #65 (device CI follow-ups: "decide how a CI build can enable drafts without that code
reaching the release build"). Release builds keep the `reviewed` gate.

## Problem

The device CI should drive the app in Arabic to prove right-to-left on a real emulator and simulator. The native
app passes the release gate, `reviewed`, to `createKernel` from `src/platform/ports.ts`, and no locale is
signed off yet (`docs/strings-review.md`), so a native build offers English only and an RTL flow has nothing to
choose. The web harness solved the same problem with `src/platform/ports.web.ts` (the 2026-09-30 web harness
proposal), a seam native builds never see. Native CI builds need a seam of their own, and the earlier proposal
refused a build-time flag because it could leak into a release by mistake.

## Change

- `app.config.ts` sets `extra.localeGate` to `drafts` only when the build environment has
  `UW_LOCALE_GATE=drafts`, and to `reviewed` otherwise: anything but that exact value keeps the release gate.
- `src/platform/locale-gate.ts` reads `extra.localeGate` from `expo-constants` and exports `drafts` only when the
  embedded config says exactly `drafts`; `src/platform/ports.ts` re-exports it as `localeGate` in place of the
  literal. The root layout is unchanged.
- `.github/workflows/device.yml` sets `UW_LOCALE_GATE=drafts` for its prebuild and build steps only. Its APK and
  simulator app are CI artifacts signed with the debug keystore or not signed, never a release.
- The leak is refused mechanically. `npm run bundle`, the last step of `verify`, evaluates the app config the way
  an EAS build does, with `UW_LOCALE_GATE` removed from the environment, and fails unless `extra.localeGate` is
  `reviewed`; it evaluates it once more with `UW_LOCALE_GATE=drafts` and fails unless the seam still works; and
  it fails if any profile in `eas.json` sets `UW_LOCALE_GATE`.

## Alternatives

- `EXPO_PUBLIC_UW_LOCALE_GATE`, inlined into the JavaScript bundle by Metro. The same leak risk, and the bundle
  check cannot find the inlined value in a minified bundle, while the app config is plain data it can read.
- A second native build in CI with the release gate for the main flows and one with drafts for the RTL flow.
  Proves both gates on a device, at the price of another 12 minutes on Android and 17 on iOS per run.
- Sign off Arabic first. External to this work, and the RTL flow would still wait on it.

## Rules affected

Rule 4: `app.config.*` and `src/platform/` are shared roots; this proposal is the approval. No rule of 1 to 4 is
broken, so there is no row in `docs/exceptions.md`: `src/platform/locale-gate.ts` imports an Expo module and no
application code, as rule 2 allows. The device CI's main flows now run with the drafted locales offered; the
release gate itself is proven by the bundle check and the sim (`SE-1`), not on a device.
