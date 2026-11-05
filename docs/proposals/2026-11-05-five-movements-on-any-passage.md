# The five movements on any Scripture passage

Status: proposed, awaiting a decision from the requirements owner (issue #93).

## Problem

A leader can take an Open Bible Stories story through the five movements (Observation, Translation, Discourse,
Theological, Journal), but not a passage of Scripture. Read in the code on 2026-11-05:

- The movements are keyed to a story. `movements(library, entry, story)` in `src/lib/corpus/loaders.ts`
  (around line 321) reads `movementKeys(reader).get(story)` from the formation burrito, and `formationOf` in
  `src/lib/formation/sessions.ts` (lines 30 to 49) turns those story-specific markdown sections into
  questions. There is no passage-agnostic content.
- The movement ids are `sessionMovements` in `src/lib/domain/events.ts` (lines 43 to 49), and every formation
  event names a `track` from `tracks` (`foundations`, `training`, `topics`) and a `session` number.
- Study has no formation concept, and `src/features/study` may not import `src/features/formation` (rule 2).
- A Position is `{ track, session, movement? }`, so it cannot name a passage. That is #94
  (`2026-11-05-groups-for-scripture.md`).

No requirement covers this today: FO-1 to FO-3 define the movements on Foundations only. Accepting it adds a
requirement, so it needs a row in PRD section 7.4 and the decision log.

## Change

Recommended order: decide #94 first, then build this on it, so a passage walk is a session of a group's
Scripture track and there is one position model and one note table.

- **Prompts (a), recommended to ship first.** Generic prompts per movement, written once in English as
  strings (`formation.passage.<movement>.<n>` in `src/lib/strings/en/formation.ts`, every locale file gets the
  keys). The kernel returns movement ids and the passage; the screen looks up the prompts. The wording is
  theological content: it needs an author and a reviewer from the content team before it ships, and an agent
  does not write it.
- **Kernel.** The `formation` module owns it, because it already owns movements, positions and notes
  (`formationTables`). New interface: `passageSession(reference, language)` returning the passage's
  movement steps, and the existing `start`, `advance`, `complete`, `note` and `saveNote` taking a Scripture
  position (`FormationApi` in `src/lib/formation/formation.ts`). Events: the existing `SessionStarted`, `MovementCompleted`, `SessionCompleted` and
  `SessionNoteSaved`, widened by #94 to carry a `scripture` track and a reference, rather than a parallel set.
  Changing `src/lib/domain/events.ts` is a shared root (rule 4); it is the same change #94 proposes.
- **Journal movement.** The Journal movement saves the group's note for that passage (FO-6). It is called a
  note, not a journal entry: in `CONTEXT.md`, Journal is the event log. Notes never enter the journal or the
  snapshot (`replay.md` rule 8).
- **Shared step UI.** The movement chips and the step card (`MovementsCard.tsx` and its `MovementChip` today) move to
  `src/shared/ui/movements/` as a component that takes the movement list, the selected id, the done set and
  the words as props, with no feature import, so Study and Formation both use it. Moving code into
  `src/shared/` is a shared-root change (rule 4).
- **Study.** A "Work through this passage" action on the passage header (`StudyHeader.tsx`), through the study
  feature's `service.ts`, opening a route with the five movements as steps and the passage text visible above
  them. With no active group, the action first asks the leader to choose or create one.
- **Tests.** A scenario named for the new requirement walks a fixture-language passage through all five
  movements and saves a note; tests at the formation interface cover the passage session; the shared step
  component keeps its accessibility tests.

## Alternatives

- **(b) New passage-agnostic content from the content team.** A movements guide as a burrito, flavored like
  the formation burrito, with a row in `docs/content-contract.md` and a fixture. Better long-term, since the
  content team owns formation wording, but it waits on content that does not exist. It can replace (a) later
  without changing the kernel interface.
- **A walk without a group.** Lets a leader work alone, but needs a new durable value (notes keyed by reference
  with no group) and a second note owner or a second table. Not recommended: a group costs one name, and FO-4
  already makes groups cheap.
- **A Study-only feature that copies the movement UI.** Avoids touching `src/shared/` but leaves two copies of
  the step UI. Refused by rule 2's own fix: shared code moves to `src/shared/`.

## Rules affected

- Rule 4: `src/lib/domain/events.ts` (shared with #94) and a new `src/shared/ui/movements/` component.
- Rule 2: Study and Formation reach the step UI only through `src/shared/`; Study reaches the kernel through its
  `service.ts`.
- Rule 3: no new writer; notes stay in `formation_notes`, owned by `formation`.
- Rule 1: new strings in the formation table and every locale file.

## Decision needed

1. Should leaders be able to run the five movements on any Scripture passage? If yes, this adds a Must or
   Should requirement to PRD section 7.4; which priority?
2. Where the prompts come from: **(a) generic prompts as strings, written by the content team, shipped first**
   (recommended), or (b) wait for a passage-agnostic movements guide from the content team. Who writes and
   reviews the English wording?
3. Does a passage walk always belong to a group: **yes, it is a session of the group's Scripture track (#94)**
   (recommended), or may a leader walk a passage with no group?
