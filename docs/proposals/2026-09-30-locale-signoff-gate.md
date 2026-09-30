# Ship only the locales a native speaker has signed off

Status: approved in issue #51 (the issue's decision is the requirements owner's delegate's approval). The
native review itself is external and not part of this change.

## Problem

PRD section 11 ships every locale whose strings are complete, and falls back to English string by string for
the rest. All fifteen non-English tables are complete in the sense of every key having a value, but every one
was drafted by an AI agent (`docs/strings-review.md`). Issue #51 decides that complete means reviewed: a locale
ships in v1.0.0 only after a native speaker signs it off.

## Change

- One typed source of truth: `localeSignOffs` in `src/lib/strings/locales.ts`, a sign-off date or `null` for
  each of the fifteen drafted locales, all `null` today. English is the source and always offered.
- `offeredLocales(gate)`: English and the signed-off locales under the release gate (`releaseGate`,
  `reviewed`); all sixteen under `drafts`. `resolveLocale(tags, offered)` takes the first device tag whose
  locale is offered, else English, so a phone set to an unreviewed language, or a stored choice of one, opens
  in English. The Strings module lists, accepts and resolves only offered locales; its tables, `t`, `plural`
  and `completeness` still cover all sixteen, so the drafts stay in the repository and testable.
- What "falls back to English string by string" means now: an unreviewed locale is not offered at all, so
  every string is English; a reviewed locale falls back to English for any key whose value is `null`, as before.
- `src/lib/kernel.ts`: `createKernel` takes `localeGate`. When set, the Strings and Preferences modules are
  built for that gate (`stringsModuleFor`, `preferencesModuleFor`); the app passes none and gets the release
  gate. The sim's `DeviceOptions.localeGate` passes it through, and the scenarios that run the app in French,
  Swahili, Arabic, Farsi or Urdu (ON-1, HO-2, SE-1, SH-4) use `drafts`, so right-to-left stays proven before
  Arabic, Urdu and Farsi are reviewed. `SE-1.unreviewed-locales-are-not-offered` proves the release gate.
- `docs/strings-review.md` gains a sign-off table (locale, reviewer, date), all empty. The `locale-signoff`
  check fails when the table and `localeSignOffs` disagree for any locale.

## Alternatives

- Keep offering the drafts and label them in Settings. The decision is that unreviewed copy does not ship.
- Remove the unreviewed tables from the repository. Reviewers work from them, and the sim needs them.
- Carry the gate as a preference or a Locale port field. It is a release policy, not a leader's choice or a
  device fact, and a port change would touch every adapter.

## Rules affected

Rule 4: `src/lib/kernel.ts` is a shared root. `src/lib/preferences/preferences.ts` resolves the locale through
the gate. Recorded in `docs/exceptions.md`.
