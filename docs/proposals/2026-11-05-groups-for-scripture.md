# Groups for Scripture

Status: approved by the requirements owner on 2026-11-05 ("Go with your suggestions above"): the recommended option of every question below is the decision. (issue #94)

## Problem

A group can follow only a Formation track. A leader cannot lead a group through a book or passage of Scripture
with the same position and notes. Read in the code on 2026-11-05:

- `tracks = ['foundations', 'training', 'topics']` in `src/lib/domain/events.ts` (line 41), and `Position` in
  `src/lib/formation/types.ts` is `{ track, session: number, movement? }`.
- `migrations/0200-formation.ts` keys both `formation_groups` and `formation_notes` on `(track, session INTEGER)`;
  the notes' primary key is `(group_id, track, session)`.
- The payloads of `SessionStarted`, `MovementCompleted`, `SessionCompleted`, `SessionNoteSaved` and
  `PositionChanged` (events.ts lines 169 to 183) require a track from `tracks` and a `session` count.
- The `formation` module's snapshot lists each group's position, and `formationSessionsStarted`
  (`src/lib/telemetry/folds.ts`) counts `SessionStarted` per language.
- `GroupsScreen.tsx` opens only `sessionHref(track, session)`, `NotesCard.tsx` takes `(group, track, session)`,
  and `StudyScreen` has no group concept. The prototype's groups are Open Bible Stories only
  (`UwResourcesApp.dc.html` line 561).

FO-4 scopes a group's position to "the pathway" and FO-6 its notes to a session, so this widens both. That is a
product decision, recorded in the decision log once taken.

## Change

- **Domain.** A fourth track, `scripture`. Its Position names a Reference (`CONTEXT.md`): a book and chapter,
  with an optional verse range. `Position` becomes a union: the three existing tracks keep
  `{ track, session, movement? }`; `scripture` is `{ track: 'scripture', reference, session, movement? }`, where
  `session` is the chapter, so ordering and progress (chapters done of chapters in the book) fold as they do
  for the other tracks. `CONTEXT.md` gains the track before any code (rule 1, "new word").
- **Migration.** A new `migrations/0201-formation-scripture.ts`, never an edit of 0200:
  - `ALTER TABLE formation_groups ADD COLUMN reference TEXT`, null for every existing row, so those rows stay
    valid unchanged.
  - A new table `formation_passage_notes (group_id TEXT NOT NULL, reference TEXT NOT NULL, body TEXT NOT NULL,
    PRIMARY KEY (group_id, reference))`. A separate table, because SQLite cannot change the primary key of
    `formation_notes` without rebuilding it. `formation` owns it and adds it to `formationTables` (rule 3).
- **Events.** The five payloads above admit `scripture` in their track and gain `reference: 'reference?'`. A
  refinement requires the reference when the track is `scripture` and refuses it otherwise. No new event
  types.
- **Replay (DX-3).** An old journal carries no `reference` and only the three old tracks, so it parses and
  redoes as before; a scenario replays a recorded pre-change journal to the same snapshot to prove it. A
  journal with `scripture` events replays through the same `redo` handlers.
- **What the leader read.** A Scripture position is reading in the sense of decision 70. In the default
  diagnostics file (`leaveOutReading`, `src/lib/share/reading.ts`), the five events lose their `reference`
  and the snapshot shows a Scripture group's track without its reference. Such a file replays everything
  except Scripture positions and notes keys, and the replay names each as a divergence, as it does a left-out
  bookmark (`replay.md`).
- **Folds.** `formationSessionsStarted` counts a Scripture session in its language like any other; the fold
  list in PRD section 9 is unchanged, and no fold sees a reference.
- **UI.**
  - Groups: create a group for a book of Scripture (book chosen with the existing book picker), shown with its
    current chapter.
  - Study: when the active group follows Scripture, the passage view shows the group's current chapter, its
    note for that passage and "Mark as done here", which advances the position. Group notes on Study use the
    keyboard-safe layout from #95.
  - With #93 (`2026-11-05-five-movements-on-any-passage.md`), a Scripture session can run the five movements
    on its passage.
- **Tests first.** Scenarios named for FO-4 and FO-6 create a Scripture group in the fixture language, advance
  it, save a note per passage and restart the device; a replay scenario covers the old journal; tests at the
  formation interface and `events.test.ts` cover the refinement.

## Alternatives

- **Rebuild `formation_notes` with `reference` in its key.** One table instead of two, but the migration copies
  every note through a new table and a rename; a failure there touches notes leaders already wrote. Not
  recommended.
- **Encode the reference in `session`** (for example book ordinal times 1000 plus chapter). No schema change,
  but the column then means two things, verse ranges cannot be expressed, and every reader must decode it.
  Refused.
- **Scripture positions in a new module.** A second owner of group positions would split one group's state
  across two writers. Refused by rule 3.
- **Keep groups to the pathway.** FO-4 and FO-6 as written. Leaders who teach from Scripture track it outside
  the app.

## Rules affected

- Rule 4: `src/lib/domain/events.ts`, `src/lib/formation/types.ts` (through the domain union), a new migration
  and `src/lib/share/reading.ts` are shared roots or kernel files; this proposal is their review.
- Rule 3: `formation` stays the one writer; `formation_passage_notes` joins its `owns`.
- Rule 1: `CONTEXT.md` first for the new track; new strings in every locale file.
- DX-3: held by the replay scenario above. This would also become an ADR if accepted, since it changes the
  shape of a Position and is hard to reverse once journals carry it.

## Decision taken

1. Should a group be able to follow Scripture, widening FO-4 and FO-6? **Yes, as a fourth track, `scripture`**
   (recommended), or no.
2. The unit of a Scripture position: **a book, advancing chapter by chapter, with an optional verse range**
   (recommended), or any passage the leader names with no book order.
3. Is a Scripture group's position "what the leader read", left out of the default diagnostics file as
   decision 70 does for passages? **Yes** (recommended), accepting that such a file cannot rebuild Scripture
   positions; or no, keeping it in so replay is complete.
4. Does a Scripture session count in `formationSessionsStarted`? **Yes, per language, with no new fold**
   (recommended), or not at all.
