# Replay: how a module keeps its events replayable

DX-3 asks that a journal shared from a phone rebuild the device in the sim to the same snapshot. This page is
the contract every kernel module signs so that stays true. Words are in [`CONTEXT.md`](../CONTEXT.md); the shape
is in [`architecture.md`](architecture.md); the reason is [ADR 0003](adr/0003-events-as-the-spine.md).

## What travels

`kernel.journal.export()` returns a document `{ format: "unfoldingword-journal", version: 2, limit, dropped,
baseline, events }`. Each event is `{ seq, type, at, payload }`. `baseline` holds, per module that declares a
`checkpoint` fold, the fold of every event the bounded journal has dropped, so a count derived from the journal
never goes backwards when old events leave it. Today only Telemetry declares one: its running counts and its
set of days of use. `parseJournalExport` in `src/lib/journal/export.ts` is the
only reader, and it validates every event against its schema.

`npm run replay -- <journal.json>` (in `sim/replay.ts`) builds a fresh sim device with the same journal limit,
starts its journal at the recorded first `seq` with the recorded `dropped` count and `baseline`, walks the
recorded events in order, and asks the kernel to redo each one. It prints the rebuilt snapshot and
journal, and names the first places where the rebuilt journal differs from the recorded one. A match event for
event means the snapshot is the same, because the snapshot is a fold of module state and the journal.

## One table for every event

Every event type is a row in `eventSchemas` in `src/lib/domain/events.ts`. The row gives:

- **payload**: each field's kind (`id`, `slug`, `language`, `reference`, `count`, `code`, and the rest in
  `src/lib/domain/fields.ts`) or a closed list of literals. An `id` has the shape the Ids port mints, a UUID on
  a phone or `name-000001` in the sim, so a group can never be journaled under a name. A `Failure` context is
  a closed record (`failureContextKinds` in `src/lib/domain/failures.ts`): each key has one kind, and a step is
  one of a closed list. `PreferenceChanged.key` is one of `preferenceSchemas` in
  `src/lib/domain/preferences.ts`; a key a leader types into, such as `home.name`, is journaled with no value,
  and every other key with a value from its closed list. The TypeScript types come from this row, and the
  journal refuses any event that does not match it. No kind accepts text with spaces, so nothing a leader typed,
  such as a first name, a group name, a note or a search query, can enter the journal (DX-1). A name or a note is
  recorded as the id of what it belongs to, never as its text. A field may also be a bounded list of records,
  `{ list: { field: kind, ... }, max }`, whose every field is one of the same kinds: `PackInstallStarted.releases`
  and `PackInstalled.burritos` are lists, so a title or a licence statement, which hold spaces, stay out of the
  journal and are read from the burrito's `metadata.json` instead.
- **replay**: one of three classes.

| Class | Meaning | What replay does |
|---|---|---|
| `redo` | An intent: a command a leader or the app started | Calls the owning module's `redo[type]`, which re-issues the command from the recorded payload |
| `follows` | A consequence of a `redo` command, including every `Failure` | Nothing; the redone command emits it again |
| `verbatim` | An observation that changes nothing but the journal | Appends it again as recorded |

`AppOpened` is `redo`, and replay redoes it by restarting the device: a new kernel over the same memory adapters.
The kernel journals it in `start` and again from `resume()` when the app comes back to the foreground on a day
with no `AppOpened` yet; a restart in replay journals the same event at the same time, so both replay alike.

## The rules a module follows

1. **Register in one place.** A module is `defineModule({ events, owns, create })` in its own folder under
   `src/lib/<module>/`, and one line in `kernelModules` in `src/lib/kernel.ts` (a new module is an
   architecture change with a proposal). `events` lists every type it
   emits; no two modules list the same type, and the kernel refuses an emit of a type the module does not own.
   `Failure` may be emitted by any module. `owns` lists its tables, directories and preference keys.
2. **A `redo` command emits its root event first**, before anything that can fail, and then only `follows`
   events. A command that can fail before it has a result has a started event (`PackInstallStarted`,
   `CatalogRefreshStarted`, `IndexStarted`) as its root. Work a module does on its own in reaction to an
   event is part of that reaction and emits only `follows` events: when a pack with text arrives or leaves
   for a language whose full-text index is wanted, Corpus rebuilds the index inside its `PackInstalled` or
   `PackRemoved` reaction and emits `IndexBuilt` with no `IndexStarted`, so the redone install emits it again
   at the same place in the journal. A command whose only step that can fail is one local database write
   (a bookmark, a group, a position, a note) is the other way round: it writes first and emits its event only
   once the write has succeeded, so the journal never says a bookmark was added that the database refused. When
   the write fails it emits only a `Failure` with the port's code (`db.io` when the error carries none) and the
   event it would have emitted in `context.type`, and returns `{ ok: false, code }` (`Written` in
   `src/lib/written.ts`). Replay has nothing to redo for it, so the rebuilt state is the same and the replay
   names the recorded `Failure` as the first divergence.
3. **The redo handler uses only the recorded payload.** If a command needs a value that the journal may not
   hold, such as text a leader typed, the redo supplies a neutral stand-in and the snapshot must not show the
   difference. This is why a snapshot shows that a first name is set, never the name.
4. **Time enters only as an event's `at`.** Only the journal reads `Clock.now()`, once per event. A module is
   handed a clock with `dayOf` and no `now`. A module that needs the current time emits with the function
   form, `emit((at) => ({ type, payload }))`, or reads `at` from events it has observed. Replay plays the recorded times back in order, and `Clock.dayOf` plays back the day
   recorded on each `AppOpened`.
5. **Every minted id appears in the next event.** An id taken from `Ids.next()` appears in an `id` field of the
   next event the command emits, before another id is minted. The kernel holds each module to this: the
   `Ids` a module is handed throws on a second mint while an id is unannounced, and `emit` throws on an event
   that does not carry it. The one way to close an id without carrying it is a `Failure`: an id minted for a
   write that failed belongs to nothing, no event carries it, and replay never plays it back. Replay plays ids
   back in the order they first appear in the journal.
6. **Reactions are awaited and do not rerun.** `observe(entry)` is called for each module in journal order, as
   the entry is appended, and may return a promise; `emit` resolves only once every module's reaction to that
   entry has settled. A reaction that throws becomes a `Failure` with code `kernel.observer-failed` and the
   observer's name. `observe` never sees the entries reloaded from the database at start: a module rebuilds
   its state from its own tables in `start`. Reactions of different entries may overlap; a module whose
   reactions must not overlap chains them itself.
7. **A module writes only what it owns.** The `db`, `files`, `kv` and `http.download` a module is handed
   refuse, with code `kernel.not-owned`, a statement that writes a table, a path outside a directory, or a
   preference key that is not in its `owns`. Reads are not scoped: a module reads another's values through
   the owner's exported functions. Audio from a URL off the host allowlist is refused.
8. **Snapshots are pure and identify no one.** `snapshot()` returns JSON built from module state only. It leaves
   the device with the journal (DX-2), so it carries no names, notes, typed text, locale, region or time zone.

## What the journal cannot carry

- **Content bytes.** A pack installed from a peer or a file is not in the journal. `PackInstallStarted` is
  `redo` for every source, and in replay the sim world stands in for the peer or the file by serving the same
  release from its fixtures. Transfer events are `verbatim` for the same reason: the other phone is not there.
  Concretely, `PackInstallStarted` records the target pack and the releases chosen (publisher, resource,
  language, tag), and its redo downloads each from its `sb/{tag}.zip` address, which the sim world serves, while
  keeping the recorded source. `ImportReceived` is `verbatim`, so a file import replays as the recorded
  `ImportReceived` followed by the redone install. A burrito the fixtures do not hold, such as a local release
  imported from a file, fails in replay with `http.status` and the replay names that divergence. A newer release
  published during the recording (`world.fixtures.publish`) must be published in the replay world too, and it
  stays published, so the replay of an earlier refresh sees it. Install progress is kept out of the journal
  except for at most ten `PackInstallProgressed` events per install; byte counts live in
  `packs.installing()` and the snapshot.
- **The other phone.** A receiving Transfer takes every archive into `transfer/incoming/` and verifies it
  before it hands Packs a peer delivery, so a receiver's journal reads `TransferAccepted`, at most ten
  `TransferProgressed`, `TransferCompleted`, and only then `PackInstallStarted` with source `peer`. Replay
  appends the Transfer events as recorded and redoes the install from the fixtures, in the same order. A
  transfer id is minted on the phone and appears only in `verbatim` events, so replay plays back only the ids
  that a `redo` or `follows` event carries (`mintedIds` in `sim/replay.ts`); otherwise the first redone
  install would take the transfer's id. The Transfer snapshot shows the last result, folded from the
  Transfer events it observes, so it replays too. The app package an Android phone received is not in the
  journal: its `receivedApp` fact comes from the file in `transfer/app/`, which a replay does not have, and
  the replay names that divergence in the snapshot. `AppInstallerOpened`, journaled when the system installer
  opens on that package, is `verbatim` and replays as recorded.
- **A platform fault at boot.** A fault the platform raised before any kernel existed, such as the iCloud backup
  exclusion failing closed, is journaled by the next kernel that starts as a `Failure` before `AppOpened`
  (`KernelOptions.faults`). Replay restarts the device on memory adapters, which raise no such fault, so the
  replay names that `Failure` as its first divergence, as it does a failed migration.
- **A share.** `ShareSent` is `verbatim` and names the kind and the language, never the text. The journal
  file a leader shares (`diagnostics/journal.json`, DX-2) is a journal export with the device snapshot beside
  it under `snapshot` and a `reading` field, so `npm run replay` reads it as it is.
- **What a leader read, unless they include it.** By default the shared file leaves reading out
  (`reading: "left-out"`, `leaveOutReading` in `src/lib/share/reading.ts`): every event stays, with its time,
  but `PassageOpened`, `ArticleOpened`, `StoryOpened` and `BookmarkAdded` lose their `reference`, `article`
  and `story` fields, the snapshot counts the bookmarks instead of listing them, and the last passage per
  language is gone. Those three fields are optional in the event table so the file still parses. Such a file
  replays without error and rebuilds everything else: packs, corpus, groups and their positions, preferences
  other than the last passage, telemetry folds, transfers and failures. It cannot rebuild a bookmark or the
  last passage read, so the replayed device has no bookmarks, a replay names each left-out `BookmarkAdded` as
  a divergence, and its id is never played back (`readingLeftOut`, used by `mintedIds`), so the ids of later
  commands still line up. A report that needs a bookmark or the reading position to reproduce asks the
  leader to share again with "Include what I read" on (`reading: "included"`); that file is the whole journal
  and snapshot and replays to the same snapshot (DX-2).
- **The world's weather.** A download that failed because the phone was offline fails again only if the replay
  world is offline too. A scenario that reproduces a field report scripts the world first, for example
  `device.adapters.http.script(url, 'offline')`, and then replays.
- **What was dropped or never written.** When `dropped` is above zero the rebuild starts from the oldest event
  kept, with the recorded `baseline`, and the replay says so. Folds come back whole; the state a dropped
  command built, such as a pack whose `PackInstallStarted` has left the journal, does not, and the replay
  names that divergence. An event the database refused is kept in memory and in the export until the
  database heals, but it does not survive the app being closed first.
