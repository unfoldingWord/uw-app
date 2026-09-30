# Leave reading history out of the shared diagnostics file by default

Status: approved in issue #20 (the issue's decision is the requirements owner's delegate's approval).

## Problem

The diagnostics file (DX-2) held the whole journal and snapshot: every `PassageOpened`, `ArticleOpened` and
`StoryOpened` reference with its time, every bookmark target, and the last passage per language. It names no
one (DX-1), but for a leader in a sensitive region the passages studied, with thousands of timestamps, is a
profile of behaviour, and the copy promised only "no names, notes or identifiers".

## Change

- `share.journal(report, { locale, includeReading })` writes the report through `leaveOutReading`
  (`src/lib/share/reading.ts`) unless `includeReading` is true. Left out: the `reference`, `article` and
  `story` fields of `PassageOpened`, `ArticleOpened`, `StoryOpened` and `BookmarkAdded`, in the events and in
  the snapshot's journal tail; the bookmark list in the snapshot, replaced by its count; the last passage per
  language. Every event stays. The file says which it is in a `reading` field (`left-out` or `included`).
- `src/lib/domain/events.ts`: `PassageOpened.reference`, `ArticleOpened.article` and `StoryOpened.story`
  become optional, so a left-out file still parses. The kernel always sets them; `preferences` ignores a
  `PassageOpened` without a reference.
- The diagnostics screen has a toggle, "Include what I read", off each time the screen opens. It is screen
  state, not a durable value, so nothing gains a writer. The sentence above it names what the file holds in
  each state (`diagnostics.body`, `diagnostics.body.reading`).
- Replay of a left-out file: see `docs/replay.md`. It does not crash, rebuilds everything but bookmarks and
  the last passage, and never plays back a left-out bookmark's id (`readingLeftOut` in `mintedIds`).

## Alternatives

- Drop the reading events from the file. Their times and counts help a report (what the app did and when),
  and the decision keeps the events and strips the fields.
- Replace a reference with a stand-in. The file would then say something false, and two stand-in bookmarks
  would merge in replay.
- Keep the toggle's state as a preference. A leader who included reading once would keep sending it without
  noticing; off by default each time is the safer default.

## Rules affected

Rule 4: `src/lib/domain/*` is a shared root (three fields made optional). Recorded in `docs/exceptions.md`.
