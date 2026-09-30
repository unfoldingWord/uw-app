# Correct where a new string goes in AGENTS.md rule 1

Status: accepted in issue #6 (2026-09-30). Applied as a doc-only correction on 2026-09-29 (T13) and recorded
in `docs/progress_tracker.md`. No code changes.

## Problem

AGENTS.md rule 1 says "New string: `src/lib/strings.ts`; every locale file gets the key." That file does not
exist. Since T7 the string table is a folder: the English table by area in `src/lib/strings/en/*.ts`, one
file per locale in `src/lib/strings/locales/*.ts`, and the Strings module in `src/lib/strings/strings.ts`. An
agent that follows the rule literally creates a second table.

## Change

One line in AGENTS.md rule 1:

> - New string: the English table by area in `src/lib/strings/en/`; every locale file in
>   `src/lib/strings/locales/` gets the key.

## Alternatives

- Leave the rule and add a `src/lib/strings.ts` barrel so the path is true again. It would be a file that
  exists only to match a document, and the rule would still send the English copy to the wrong place.
- Leave it. Agents keep tripping on it.

## Rules affected

Rule 1's template list only. The strings check (`scripts/checks/strings.check.ts`) already enforces that every
locale file has every key, so the behaviour the rule asks for is unchanged.
