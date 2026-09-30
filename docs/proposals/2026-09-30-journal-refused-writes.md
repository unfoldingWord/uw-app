# Journal a refused database write instead of swallowing it

Status: approved in issue #27 (the issue's decision is the requirements owner's delegate's approval).

## Problem

AGENTS.md section 10 says a failure is an event with a code and a screen shows it in place. Bookmarks
(`src/lib/bookmarks/bookmarks.ts`) and Formation (`src/lib/formation/formation.ts`) emitted their event
(`BookmarkAdded`, `GroupCreated`, `SessionNoteSaved` and the rest) and then awaited the database write with no
`catch`. A refused write left a journal that claimed the change, no `Failure`, and a rejection that the press
gate on the story screen settled silently. `useAsyncValue` in `src/shared/ui` dropped every rejection with
`.catch(() => undefined)`.

## Change

- Each write in Bookmarks and Formation runs first, through `dbWrite` in `src/lib/written.ts`. On success the
  module emits its event and updates its memory; on failure it emits `Failure` with the port's code (`db.io`
  when the error carries none) and the event it would have emitted in `context.type`, changes nothing, and
  returns `{ ok: false, code }`. Every write on both interfaces returns `Written<T> | undefined`:
  `undefined` when the request was refused before anything happened (an unknown group, an empty name), as
  before.
- `src/lib/compose.ts`: the mint ledger lets a `Failure` close an id minted for the write that failed. No event
  carries that id, so replay never plays it back (`mintedIds`), and the next command mints freely.
- `useAsyncValue` keeps the known value on a rejection and reports the code as `failure`; a later success clears
  it, and an answer older than one already settled is ignored, success or failure (`settleAsync`, tested).
- The story screen shows a refused bookmark as a notice under its header. The formation screens read the
  outcome's code instead of `unexpected`.
- The memory Db adapter's `failWrites` also takes a pattern, so a scenario can refuse the writes to one table
  while the journal still persists (`sim/scenarios/DX-1.a-refused-write-is-a-failure.ts`).
- `docs/replay.md` rules 2 and 5 say so.

## Alternatives

- Keep the event first and emit a compensating event after a failed write (`BookmarkRemoved`,
  `GroupDeleted`). The journal would still claim a bookmark was added, telemetry would count it, and the
  compensation can fail too.
- Reject with a coded error instead of returning an outcome. The formation screens already catch, but every
  other caller, and the press gate, would have to, and the issue asks for an outcome.
- Carry the minted id in the `Failure` context. `idsOf` would then count it as a minted id and replay would
  hand it to the next command, so the replayed ids would shift.

## Rules affected

Rule 4: `src/lib/compose.ts` and `src/shared/ui/useAsyncValue.ts` are shared roots. Recorded in
`docs/exceptions.md`.
