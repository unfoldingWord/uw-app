# Architecture: the tower

How the app is shaped so that one agent can hold the whole of it, prove it works without a phone, and change one place to change one thing. Words are defined in [`CONTEXT.md`](../CONTEXT.md); what to build is in [`PRD.md`](PRD.md); why the shape is this way is in [`adr/`](adr/).

## The tower, top to bottom

```
app/            routes: one line each, re-exporting a feature screen
features/       screens and a service.ts per feature, pure over the kernel
lib/kernel      createKernel(ports) wires every module once per device
lib/modules     Catalog  Packs  Corpus  Formation  Transfer  Share  Journal  Strings
lib/domain      types, references, provenance, events: the words of CONTEXT.md as code
ports           the interfaces the kernel needs from the world
platform/       the platform adapter for every port (Expo modules)
sim/            the memory adapter for every port, fixture content, scenarios, CLI
```

Each layer is legible without the one below it. A screen reads a feature service; a service reads the kernel's interface; the kernel's interface is the union of eight small module interfaces; each module is deep, with its behaviour behind a few functions and its tests at that interface. Imports go down only, and lint enforces it.

## The kernel

```ts
createKernel(ports: Ports): Kernel

Kernel = {
  catalog, packs, corpus, formation, transfer, share, journal, strings,
  snapshot(): DeviceSnapshot,
}
```

One composition root. The phone calls it once with platform adapters. The sim calls it many times with memory adapters. Nothing else constructs a module. This is the single fact an agent needs to hold: everything the app can do is a call on the kernel, and everything the app has done is in its journal.

## Ports

Every port has exactly two adapters, platform and memory, so every seam is real. Ports are the only place the kernel touches the world.

| Port | Provides | Memory adapter |
|---|---|---|
| Clock | now | settable, advanceable |
| Ids | next id | sequential |
| Files | read, write, list, rename, delete under a root | in-memory tree |
| Db | SQL over the device database | in-memory SQLite |
| Kv | preferences | map |
| Http | fetch with timeout, host allowlist, offline signal | fixture responses, scripted outages |
| Transport | peer discovery, byte streams | a shared in-memory bus between sim devices |
| Audio | play, pause, position | scripted clock |
| ShareSheet | hand a payload to the system | records payloads |
| Locale | device locale, region, time zone | settable |

Determinism follows: with Clock and Ids injected, a scenario reproduces byte for byte, and a journal exported from a phone replays in the sim to the same snapshot.

**The web render harness is not a third adapter set** (ADR 0008). `npm run shots` exports the real app for the web and photographs every screen in Chromium. On web Metro picks `src/platform/ports.web.ts`, a one-line re-export of `@sim/web/ports`, which builds the Ports from the memory adapters and the sim's pinned Clock and Ids, restores a device image the sim wrote in Node, and makes Files, Kv, Db and Http wait for it; it passes the `drafts` locale gate so the right-to-left and script modes render their drafted locales. The memory Db adapter takes its SQL engine, `node:sqlite` in Node and sql.js in the browser (ADR 0011). `npm run bundle` fails if any module from `sim/`, `scripts/`, sql.js or react-native-web reaches an iOS or Android bundle. The other visual check is the device CI, `.github/workflows/device.yml`: release builds on an Android emulator and an iOS simulator driven by the Maestro flows in `device/flows`.

## Modules

Each is a deep module: small interface, tests at the interface, internals free to change. Interfaces below are the whole of what a caller learns; anything else is internal.

**Catalog.** `refresh()`, `languages()`, `releases(language)`. Reads Door43's catalog through Http and normalizes it into releases, each carrying the URL of its generated Scripture Burrito archive. The only module that knows Door43's shape.

**Packs.** `install(source, plan)`, `installed()`, `remove(pack)`, `updates()`. One install path for all three sources: `fromCatalog(release)`, `fromPeer(session)`, `fromFile(path)`. Writes beside, verifies checksums against the burrito metadata, renames over. The old pack is readable until the new one is complete. Owner of every pack directory. Each install unpacks its burritos, streamed from the archive, into a directory of its own, `packs/{kind}/{language or pack}/{install}/{publisher}/{resource}`; a burrito an update keeps stays where it is. The `packs` row in the database is the commit point: a directory no row names is garbage, removed on the next start, and the directories an update replaced are removed only after `PackInstalled` has been read by Corpus. Corpus, on start, reads the installed packs through Packs' `readInstalledPacks` and catches up with any it has not read.

**Corpus.** `passage(reference)`, `article(id)`, `story(n)`, `search(query)`, `reindex()`. Every value returned carries provenance as a required field; there is no way to get content out without it. The only module that parses USFM, TSV and Markdown.

**Formation.** `tracks(language)`, `session(track, n)`, `groups()`, `create(group)`, `advance(group, step)`. A state machine over positions. Language fallback (plain stories when movements are absent, English movements alongside when asked) is decided here, once.

**Transfer.** Sender: `offer(plan)` advertises under a short code, `run(transfer)` sends what the receiver accepts. Receiver: `discover()`, `connect(peer)` (or `connectAt(address, code)` for a typed or scanned address) sends the pairing code and shows the offer, `accept(selection)` receives and verifies every archive and returns a peer delivery (`PeerDelivery`) that hands Packs each archive as the file it was received into (`{ ok: true, path }`), never its bytes; then it is just `packs.install(fromPeer(delivery))`. Either side: `cancel()`, `current()`. On Android the receiver hands a received app package to the system installer with `installApp()`. A state machine over the Transport port, speaking a small versioned protocol (`src/lib/transfer/protocol.ts`). Carries burritos, and on Android the app package.

**Share.** `passage(passage)`, `story(story)`, `audio(clip)`, `journal(report)`, each with the locale for its words. Builds payloads with provenance and the link from content the corpus already returned, hands them to ShareSheet.

**Journal.** `append(event)`, `read(since)`, `export()`. Bounded and append-only. Failures are events here too; this is the error channel, the telemetry source and the replay input.

**Strings.** `t(key, locale, params)`, `plural(key, n, locale)`. The one string table. A sentence a module produces is a code; a screen words it.

Two smaller owners live in features rather than the kernel because they are preference-shaped, not content-shaped: bookmarks and preferences (Home owns), and the invitation schedule (Partners owns). Each is a `store.ts` with one writer.

## Events are the spine

Every module returns events; the kernel appends them to the journal. Modules never call each other's internals; where one needs to react to another, it reacts to an event.

```
PackInstallStarted   PackInstalled   PackFailed   PackRemoved   CatalogRefreshed
PassageOpened   ArticleOpened   StoryOpened   SearchRun
GroupCreated   SessionStarted   MovementCompleted   SessionCompleted
TransferOffered   TransferAccepted   TransferProgressed   TransferCompleted   TransferFailed
ShareSent   ImportReceived   InvitationShown   InvitationTapped
Failure(code, context)
```

Three things derive from the journal by pure folds, so none needs its own bookkeeping:

- **Telemetry** is a count over events, computed on the device, sent as numbers. Adding a count is adding a fold, and PRD section 9 lists which folds exist.
- **Snapshot** is the fold of the stores plus the journal tail.
- **Replay** is the journal fed back through the kernel on memory adapters.

## The sim

`sim/` is where the app is driven. It is not a test double for the app; it is the app on memory adapters.

- `createSimDevice(fixture)` returns a kernel plus the feature services.
- `createWorld()` holds any number of devices, a fixture catalog served through the memory Http adapter, and one shared Transport bus.
- Scenarios in `sim/scenarios/` are named for the requirement they prove: `SH-1.transfer-ios-to-android.ts`, `FO-5.fallback-without-movements.ts`. A scenario is ordinary code against the kernel; its assertions are on the snapshot and the journal.
- The fixture language `qaa` has a real burrito of every flavor the content contract admits, small enough to live in the repository: two short books, three stories with images, a handful of Word and Academy articles, notes, questions and word links for those books, and one audio file. `qab` has stories and no movements, for the fallback path.

The cockpit, once scaffolded:

```
npm run sim -- <scenario>        run one scenario and print its snapshot and journal
npm run sim -- all               every scenario
npm run replay -- <journal.json> rebuild a device from a shared diagnostics file, print the snapshot
npm run trace                    Must requirement IDs against scenarios and tests: fails on any without a scenario
npm run contract                 validate every fixture burrito, and a live release when online
npm run verify                   lint, typecheck (including lib with no DOM), test, knip, checks, trace, contract
```

A phone is touched for three things only: the platform adapters, the glass rendering, and the radios. Everything else is proven in the sim first, and the sim is what an agent reads when something is wrong.

## Every rule is a check

A rule that lives only in prose drifts. Each of these has a check in `verify` and in CI, and the scaffold PR is accepted only when each has been observed red once.

| Rule | Check |
|---|---|
| Imports go down the tower only | ESLint `no-restricted-imports` over aliases and relative paths |
| `lib/` is pure | `no-restricted-globals` in `src/lib/**`, plus `tsconfig.lib.json` with no DOM or React Native types |
| No code comments | lint rule over `src/`, `app/`, `sim/`, `tests/` |
| One writer per durable value | a test walks every `store.ts` `owns` export and fails on any table, directory or key claimed twice or written elsewhere |
| Provenance on every content value | the Corpus types make it a required field; the `provenance` check renders every fixture value, finds the licence, and exempts titles in `words`, `academy` and `stories` as labels by name (`CONTEXT.md`, Label) |
| No network except allowlisted hosts | the Http port refuses other hosts; a dependency scan fails on any package that opens a socket itself |
| Tokens agree | `src/shared/theme` is compared to `design-system/tokens/*.css` by name and value |
| Strings live in one table | no punctuated literal in `app/`, `features/` or `hooks/` that the table does not hold |
| Nothing unused | knip over files, dependencies, exports and types |
| Every Must requirement is proven | `trace --enforce` fails on a Must ID with no scenario named for it, unless the ID is on the documented list in `sim/trace.ts` and a test names it (SE-2, `docs/exceptions.md`); the DX-4 scenario runs the same check |
| Content matches the contract | `contract` validates every fixture burrito against `docs/content-contract.md` |

## Where a change goes

| Change | Place |
|---|---|
| A new resource flavor | `docs/content-contract.md`, then Corpus, then a fixture burrito |
| A new screen | one feature folder, one route line, one scenario |
| A new durable value | the owning feature's `store.ts` and its `owns` export |
| A new thing the world must provide | a port with both adapters, never a direct import |
| A new count for partners | a fold over events, plus the PRD list and the privacy screen |
| A new word | `CONTEXT.md` first |
| A reason the next reader will not guess | `docs/adr/` |
