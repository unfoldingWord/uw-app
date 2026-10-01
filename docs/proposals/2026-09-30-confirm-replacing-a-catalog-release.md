# Show where each burrito came from, and ask before a peer or a file replaces a catalog release

Status: approved in issue #22 (the issue's decision is the requirements owner's delegate's approval).

## Problem

A file or a peer names its release from the archive's own metadata or the wire offer, and nothing signs it
(`src/lib/packs/burrito.ts`). A burrito with the same publisher and resource as an installed one replaces it
in the pack (`src/lib/packs/install.ts`), so a crafted file labelled `unfoldingWord/qaa_ult` overwrote the
genuine release with no question asked. The source was recorded once per pack, so after a file added one
resource to a downloaded pack the whole pack read as "file", and nothing on the phone showed where a resource
came from.

## Change

- Each installed burrito records its own source (`InstalledBurrito.source`, `catalog`, `peer` or `file`), in a
  new `pack_burritos.source` column (`migrations/0007-pack-burrito-source.ts`, which copies the pack's source
  onto its existing rows). A burrito an update keeps keeps its source. `packs.storage()` lists the sources of
  each pack (`PackStorage.sources`), and the Packs snapshot shows each burrito's source.
- Before a peer or file install, Packs compares each chosen burrito with the installed one of the same
  publisher and resource. When the installed one came from the catalog and the incoming commit differs (or
  is not known), nothing is installed: Packs journals a `Failure` with the new code
  `pack.replace-unconfirmed` (context `pack`, `step` `peer` or `file`) and returns the outcome with
  `replaces`, one `Replacement` per release (title, installed tag and commit, incoming tag and commit,
  source). It keeps the one pending install: a file handed to the app stays in `packs/.inbox/` until the
  leader chooses.
- `packs.confirmReplace()` installs the pending one through the ordinary path, and `packs.declineReplace()`
  drops it and its kept file. Either ends the pending install; a new install ends it too.
- Screens: the Languages screen asks in place under the import control that was pressed, and the transfer
  receive screen asks in place of its result, each in one sentence (`common.replace.file`,
  `common.replace.peer`) with Replace and Keep the catalog copy. Storage shows each pack's sources and the
  Licence page each resource's (`common.source.*`).
- `src/lib/domain/failures.ts` gains `pack.replace-unconfirmed`; that file is a shared root, which is why this
  proposal exists.

## Alternatives

- A new event (`PackReplaceAsked`). It would say the same as the `Failure` and add a 44th event, a replay
  class and a fold for no reader; the `Failure` is `follows`, so replay does nothing for it, which is right
  because nothing was installed.
- Refuse a peer or file burrito that differs from a catalog one outright. It would block the legitimate case
  the transfer exists for: a phone with a newer or local release than the catalog the receiver last saw.
- Signed releases. Only DCS can sign them; that is raised with the DCS team separately (issue #22).

## Rules affected

- Rule 4: `src/lib/domain/failures.ts` is a shared root; one code is added. No rule is broken, so there is no
  row in `docs/exceptions.md`.
- Rule 3: `pack_burritos` keeps one writer (Packs); the migration adds a column through a migration file only.
- Replay: a confirmed install replays as any peer or file install, from the recorded `PackInstallStarted`. A
  crafted burrito is not in the sim's fixtures, so its replay fails with `http.status` and names that
  divergence, as `docs/replay.md` already says for a local release.
