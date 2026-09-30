# Fold the standing exceptions into the rules

Status: accepted in issue #6 (2026-09-30). Applied in the same commit as the AGENTS.md and PRD amendments
and the removal of the rows from `docs/exceptions.md`.

## Problem

`docs/exceptions.md` had grown to 31 rows. Rule 5 says an exception is narrow and closes; most rows never
would. Fourteen had no closing condition, or one that could not happen in practice ("closes if the sim gains a
renderer", "closes when a web product exists"): they were standing amendments to rule 2, rule 4, AGENTS.md
section 7 and PRD DX-4, recorded as exceptions. Twelve more named a closing condition that the accepted
proposals of issue #6 and the rewritten `docs/architecture.md` now meet. A reader could no longer tell what was
open from what was settled.

## Change

Fold these rows into the rule text they amend (identified by content; the old row numbers moved as rows were
added):

| Row | Now stated in |
|---|---|
| `src/platform/**` imports `@lib/ports` and `@lib/domain/*` as types only | AGENTS.md rule 2 |
| `src/platform/migrations.ts` loads migrations with `require.context` | AGENTS.md rule 2 |
| `sim/migrations.ts` reads migrations from disk | AGENTS.md rule 2 |
| The glass primitives and fonts import `expo-blur`, `expo-haptics`, `expo-font` directly | AGENTS.md rule 2 |
| The root layout reads the colour scheme and the reduced-blur default | AGENTS.md rule 2, architecture.md "The root layout" |
| The root layout holds the launch screen; `BootFailure` builds its own words | AGENTS.md rule 2, architecture.md "The root layout" |
| The fonts are imported through `@design-system/assets/fonts/*` | AGENTS.md rule 2 |
| The logo lockups are imported through `@design-system/assets/logo/*` | AGENTS.md rule 2 |
| The web render harness (`src/platform/ports.web.ts`, the SQL engine split, `backgroundImage`) | AGENTS.md rule 2, ADR 0008, ADR 0011 |
| `prototypeValues.ts` holds the prototype's literals that are not tokens | AGENTS.md section 7 |
| `referenceValues.ts` holds the reference components' literals that are not tokens | AGENTS.md section 7 |
| Script line heights and letter spacing in `createTheme.ts` | AGENTS.md section 7 |
| The glass primitives map props with no React Native meaning | AGENTS.md section 7 |
| SE-2 is proven by a test, not a scenario (`testProvenRequirements`) | PRD DX-4 |

Close these rows, whose conditions are now met:

| Row | Closed by |
|---|---|
| Preference owners in the kernel | proposal accepted; ADR 0007; architecture.md and rule 1 changed |
| `Files.uriOf` and the `media` module | proposal accepted; ADR 0009; architecture.md lists `media` |
| The `player` module | proposal accepted; ADR 0010; architecture.md lists `player` |
| The Picker port, document types and `+native-intent` | proposal accepted; ADR 0009; architecture.md and AGENTS.md section 3 list Picker |
| The kernel's `resume()` control | accepted in issue #6; architecture.md lists it among the kernel's controls |
| The layout-direction reload | accepted in issue #6; architecture.md lists the root layout's rendering inputs |
| Reduce Motion read in the root layout, `settings.reducedMotion` | architecture.md lists the root layout's rendering inputs |
| The locale gate as a kernel option | architecture.md lists it among the kernel's options |
| The drafts gate in the web harness | architecture.md lists it with the harness in the Ports section |
| The three optional opening-event fields of a left-out diagnostics file | architecture.md describes the left-out file (Share, Replay) |
| The mint ledger closing an id with a `Failure`, and `useAsyncValue` keeping the known value | architecture.md names `replay.md` rule 5 under Journal |
| `kernelModules` filled one slot per scaffold task | the scaffold PR merged (e4a9592); a new module is a proposal |

Keep the five rows that still close on an event outside this repository: the app-written audio and image
flavors, `packRows`, the provisional formation flavor (each until DCS pins a form), `Linking.openURL` for the
invitation (until a port for opening a link is admitted), and the Transport radio (until the two-phone spike is
recorded).

## Alternatives

- Leave the rows and add closing conditions to each. The conditions would be fictions, and the table would still
  mix what is settled with what is open.
- Delete the rows without amending the rules. The rules would then be false, which is the defect rule 5 exists to
  prevent.

## Rules affected

AGENTS.md rules 1 and 2, section 3 and section 7; PRD DX-4; `docs/exceptions.md`. No code changes.
