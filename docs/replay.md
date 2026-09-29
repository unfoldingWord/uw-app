# Replay: how a module keeps its events replayable

DX-3 asks that a journal shared from a phone rebuild the device in the sim to the same snapshot. This page is
the contract every kernel module signs so that stays true. Words are in [`CONTEXT.md`](../CONTEXT.md); the shape
is in [`architecture.md`](architecture.md); the reason is [ADR 0003](adr/0003-events-as-the-spine.md).

## What travels

`kernel.journal.export()` returns a document `{ format: "unfoldingword-journal", version: 1, limit, dropped,
events }`. Each event is `{ seq, type, at, payload }`. `parseJournalExport` in `src/lib/journal/export.ts` is the
only reader, and it validates every event against its schema.

`npm run replay -- <journal.json>` (in `sim/replay.ts`) builds a fresh sim device with the same journal limit,
walks the recorded events in order, and asks the kernel to redo each one. It prints the rebuilt snapshot and
journal, and names the first places where the rebuilt journal differs from the recorded one. A match event for
event means the snapshot is the same, because the snapshot is a fold of module state and the journal.

## One table for every event

Every event type is a row in `eventSchemas` in `src/lib/domain/events.ts`. The row gives:

- **payload**: each field's kind (`id`, `language`, `reference`, `count`, `code`, and the rest in
  `src/lib/domain/fields.ts`) or a closed list of literals. The TypeScript types come from this row, and the
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

## The rules a module follows

1. **Register in one place.** A module is `defineModule({ events, owns, create })` in its own folder under
   `src/lib/<module>/`, and one line in `kernelModules` in `src/lib/kernel.ts`. `events` lists every type it
   emits; no two modules list the same type, and the kernel refuses an emit of a type the module does not own.
   `Failure` may be emitted by any module. `owns` lists its tables, directories and preference keys.
2. **A `redo` command emits its root event first**, before anything that can fail, and then only `follows`
   events. A command that can fail before it has a result has a started event (`PackInstallStarted`,
   `CatalogRefreshStarted`, `IndexStarted`) as its root.
3. **The redo handler uses only the recorded payload.** If a command needs a value that the journal may not
   hold, such as text a leader typed, the redo supplies a neutral stand-in and the snapshot must not show the
   difference. This is why a snapshot shows that a first name is set, never the name.
4. **Time enters only as an event's `at`.** Only the journal reads `Clock.now()`, once per event. A module that
   needs the current time emits with the function form, `emit((at) => ({ type, payload }))`, or reads `at` from
   events it has observed. Replay plays the recorded times back in order, and `Clock.dayOf` plays back the day
   recorded on each `AppOpened`.
5. **Every minted id appears in the next event.** An id taken from `Ids.next()` appears in an `id` field of the
   next event the command emits, before another id is minted. Replay plays ids back in the order they first
   appear in the journal.
6. **Snapshots are pure and identify no one.** `snapshot()` returns JSON built from module state only. It leaves
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
- **The world's weather.** A download that failed because the phone was offline fails again only if the replay
  world is offline too. A scenario that reproduces a field report scripts the world first, for example
  `device.adapters.http.script(url, 'offline')`, and then replays.
- **What was dropped or never written.** When `dropped` is above zero the rebuild starts from the oldest event
  kept, and the replay says so. An event the database refused is kept in memory and in the export until the
  database heals, but it does not survive the app being closed first.
