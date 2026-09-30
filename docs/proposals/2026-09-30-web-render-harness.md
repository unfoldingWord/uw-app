# The web render harness, retroactively

Status: accepted in issue #7 (2026-09-30), after it was built under the 2026-09-29 exception for
`src/platform/ports.web.ts`. Recorded as ADR 0008 and, for the SQL engine split, ADR 0011.

## Problem

No screen had been seen before a phone run, and no phone is available to the agents that build the app. The
render harness (`npm run shots`) was built to fix that: it exports the real app for the web and photographs
every screen in Chromium. It was built ahead of approval. It lets `src/platform/ports.web.ts` re-export
`@sim/web/ports`, splits the memory Db adapter over two SQL engines, adds five dev dependencies
(react-native-web, @expo/metro-runtime, sql.js, @types/sql.js, playwright-core) and touches four shared roots
(`src/platform/`, `src/shared/theme`, `app/_layout.tsx`, the lint layers in `scripts/eslint/boundaries.ts`).
Its exception row had a closing condition, "a web product exists or the harness is removed", that is in
practice permanent, and no proposal existed.

## Change

Keep the harness and make it part of the rules rather than an exception:

- On web, Metro picks `src/platform/ports.web.ts`, a one-line re-export of `@sim/web/ports`. That module
  builds the Ports from the sim's memory adapters, restores a device image the sim fixture world wrote in
  Node (`scripts/shots/seed.ts`), and wraps Files, Kv, Db and Http so their first call waits for the image. The
  `platform web harness` lint layer admits exactly that one import in that one file.
- The memory Db adapter (`sim/adapters/sql-db.ts`) takes its SQL engine: `node:sqlite` in Node, sql.js in the
  browser (`sim/web/sqljs.ts`). Both run the same statements; sql.js has no FTS5, so the full-text index is not
  opened in the harness.
- These are decorators over the memory adapters and the sim's pinned Clock and Ids, not a third adapter set:
  no port gains a web adapter, and the port contract cases in `sim/adapters/contract.ts` still run against the
  two adapters only.
- `backgroundImage(gradient)` in `src/shared/theme` returns the CSS form React Native Web understands on web
  and React Native's `experimental_backgroundImage` on iOS and Android; the native path is unchanged.
- The harness uses the drafts locale gate (`docs/proposals/2026-09-30-web-harness-drafts-gate.md`), so the
  right-to-left and script modes render their drafted locales; the native app keeps the release gate.
- `npm run bundle`, the last step of `npm run verify`, exports the iOS and Android bundles with source maps and
  fails on any module from `sim/`, `scripts/`, sql.js or react-native-web (observed red with a throwaway
  `src/platform/ports.native.ts` importing `@sim/adapters/ids`). No harness module reaches a phone.
- `.github/workflows/shots.yml` runs the harness on every pull request and uploads the screenshots; it ran
  green on PR #57 (run 36659247711). The contact sheets are committed under `docs/shots/` on each release.
- architecture.md's Ports section names the harness, and AGENTS.md rules 1, 2 and 4 name its seam, so the
  exception row is removed.

## Alternatives

- Remove the harness. Screens would then be seen first on a phone, which the agents do not have; a layout or
  contrast defect would reach a device run before anyone saw it.
- A real web adapter set. That is a web product, which the PRD does not ask for, and it would be a third adapter
  per port to keep honest.
- Storybook or a component renderer. It would render primitives, not the real screens over the real kernel
  state, and would add more dependencies than the harness does.
- The device CI (`.github/workflows/device.yml`, Maestro on an Android emulator and an iOS simulator) is the
  other visual check and does see native rendering, but it takes tens of minutes, runs only on CI and covers a
  handful of flows, so it complements the harness rather than replacing it.

## Rules affected

Rule 1 (a port has exactly two adapters), rule 2 (`src/platform/*` never imports application code; nothing
outside `src/platform/*` and `sim/adapters/*` implements a port) and rule 4 (`src/platform/`, `src/shared/`,
`app/_layout.tsx`). Folded into the rule text of AGENTS.md by `docs/proposals/2026-09-30-fold-standing-exceptions.md`.
