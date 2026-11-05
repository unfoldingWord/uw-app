# The five movements in other languages

Status: approved by the requirements owner on 2026-11-05 ("Go with your suggestions above"): the recommended option of every question below is the decision. (issue #92)

## Problem

A leader using a language other than English sees the five movements in English. Two separate causes, both read
in the code on 2026-11-05:

- **The app's own words are English for everyone.** The chip labels are strings (`movement.<id>` in
  `src/lib/strings/en/formation.ts`) with drafts in all fifteen locale files. `src/lib/strings/locales.ts` sets
  `releaseGate = 'reviewed'` and every `localeSignOffs` entry is `null`, so `offeredLocales()` returns English
  only and the whole interface resolves to English (decision 71, issue #51). This is the intended gate, not a
  defect in Formation.
- **The movement content exists only in English and Indonesian** (PRD section 8.6). It comes from the formation
  burrito (`movements` in `src/lib/corpus/loaders.ts`, `formationOf` in `src/lib/formation/sessions.ts`). For any
  other language FO-5's fallback applies: `englishFor` (`sessions.ts` lines 74 to 90) loads the English
  formation when `formation.englishMovements` is on, and the card's overline reads "Talk about it · English"
  (`session.talk.source`, `MovementsCard.tsx` line 59).

What already holds: `FallbackCard.tsx` titles the movement layer "The five movements are not yet in {language}"
and offers the English toggle, as FO-5 asks. That sentence is in the app's locale, so today it is in English,
and it reaches the leader's language only once that locale is signed off.

## Change

Recommended: option (a).

- **Content (a).** Keep FO-5's English fallback as built. When the movements shown are English, the card says
  so plainly in the app's locale: the existing fallback title, plus one sentence that the content team has not
  yet published the movements in this language. Content production for more languages is tracked with the
  content team, as #9 is tracked with the DCS team. If a "how to contribute" link is wanted, its destination is
  a product decision (below); it opens in the browser and says so, as the invitation's links do (decision 68),
  so the app makes no network call for it. Without one, the sentence stands alone.
- **App language.** No new mechanism. Each locale a native speaker signs off in `docs/strings-review.md` gets
  its date in `localeSignOffs` in the same commit (the `locale-signoff` check holds the two together), and
  from then on its chip labels and the fallback sentence are in that language. Until any locale is signed
  off, Settings, Language says in one sentence that other app languages are awaiting review.
- **Tests.** A scenario under `sim/scenarios/` named for FO-5 runs a drafts-gate device in French content
  with the English movements alongside and asserts the fallback state and the source language the screen
  reads; a strings test asserts the new keys exist in every locale file.

No shared root changes: the strings are a feature area table and locale files (rule 1), and the fallback
state is already in `FoundationsSession`.

## Alternatives

- **(b) Generic per-movement prompts as strings.** Five short prompt sets, one per movement, in the locale
  tables, shown when a language has no formation content. It makes the structure translatable without the
  content team, and it is the same work #93 needs (see
  `2026-11-05-five-movements-on-any-passage.md`). Not recommended as the fix here, for three reasons: the
  prompts reach a leader in their language only through the same locale sign-off as (a), so on today's gate
  both options show English; generic prompts would sit beside a story that has story-specific English
  movements, and the two would disagree; and the prompt wording is theological content that needs an author
  and a reviewer, which strings drafted by an agent do not have.
- **Offer drafted locales.** Setting `releaseGate` to `drafts` would show the agent-written translations
  today. Refused by decision 71: no native speaker has reviewed them.
- **Hide the movements outside English and Indonesian.** Contradicts FO-5, which asks for the English
  alongside.

## Rules affected

- Rule 1: new strings in `src/lib/strings/en/formation.ts` and every file in `src/lib/strings/locales/`.
- Section 10: unchanged. A contribution link, if chosen, opens in the browser; it is not an Http port call.
- No change to rules 2 to 5 and no shared root.

## Decision taken

1. Content when a language has no five-movement content: **(a) keep the English fallback and say so plainly**
   (recommended), or (b) generic per-movement prompts as strings (the #93 work), or both.
2. Should the sentence link to "how to contribute"? Recommended: no link until a page for contributing
   formation content exists; if one exists, name its address.
3. Which locales should be reviewed first under #51, and who reviews them? The order sets which leaders see
   the chip labels and the fallback sentence in their language first. Recommended: the eight full-core
   languages of PRD section 8.6, starting with Spanish (Latin America), Hindi and Arabic.
