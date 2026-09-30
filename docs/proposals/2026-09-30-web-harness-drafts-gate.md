# Render the drafted locales in the web shots harness

Status: approved with issue #51 (the locale gate) and the integration brief that merged it with the render
harness. The native app keeps the release gate.

## Problem

Issue #51 put a locale gate in the kernel: the app offers English and the signed-off locales only, and the
default is the release gate. The web shots harness boots the same root layout, `app/_layout.tsx`, over the
memory adapters from `sim/web/ports.ts`, and seeds each device image through `createSimDevice` in
`scripts/shots/seed.ts`. Both got the release gate, so the `rtl`, `ur` and `hi` shots rendered English in a
mirrored layout, and the harness stopped proving right-to-left and the script faces.

## Change

- `sim/web/image.ts` exports `harnessLocaleGate`, `drafts`, the one value both halves of the harness use.
- `scripts/shots/seed.ts` passes it to `createSimDevice`, so a stored choice of Arabic, Urdu or Hindi is kept.
- `src/platform/ports.ts` exports `localeGate = 'reviewed'`, the release gate, and `sim/web/ports.ts` exports
  `localeGate = harnessLocaleGate`, which `src/platform/ports.web.ts` re-exports. Metro picks the `.web.ts`
  file only for the web bundle, so only the harness gets `drafts`.
- `app/_layout.tsx` passes `localeGate` from `@platform/ports` to `createKernel`.

## Alternatives

- A build-time environment flag read in the root layout. It could leak into a native build by mistake, and it
  adds a second seam beside the `.web.ts` one the harness already uses.
- Sign off the locales, or render the harness in English. The first is external and the second loses the
  right-to-left and script checks.
- Leave the native app passing nothing. Passing `reviewed` states the release gate where the app composes
  its kernel, and a rename of the gate fails the typecheck there.

## Rules affected

Rule 4: `src/platform/` and `app/_layout.tsx` are shared roots. Recorded in `docs/exceptions.md`.
