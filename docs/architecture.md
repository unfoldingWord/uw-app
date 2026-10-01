# Architecture: the tower

How the app is shaped so that one agent can hold the whole of it, prove it works without a phone, and change one place to change one thing. Words are defined in [`CONTEXT.md`](../CONTEXT.md); what to build is in [`PRD.md`](PRD.md); why the shape is this way is in [`adr/`](adr/).

## The tower, top to bottom

```
app/            routes: one line each, re-exporting a feature screen; _layout.tsx composes the kernel
features/       screens and a service.ts per feature, pure over the kernel
shared/         glass primitives, theme, fonts and UI helpers every feature may use
lib/kernel      createKernel(ports, options) wires every module once per device
lib/modules     Telemetry  Catalog  Packs  Corpus  Formation  Strings  Preferences  Bookmarks
                Partners  Transfer  Share  Media  Player          (Journal is the kernel's own)
lib/domain      types, references, provenance, events: the words of CONTEXT.md as code
ports           the interfaces the kernel needs from the world
platform/       the platform adapter for every port (Expo modules and local modules under modules/)
sim/            the memory adapter for every port, fixture content, scenarios, CLI
```

Each layer is legible without the one below it. A screen reads a feature service; a service reads the kernel's interface; the kernel's interface is the union of thirteen module interfaces (`kernelModules` in `src/lib/kernel.ts`) and the kernel's own controls; each module is deep, with its behaviour behind a few functions and its tests at that interface. Imports go down only, and lint enforces it.

## The kernel

```ts
createKernel(ports: Ports, options: { migrations, journalLimit?, tailSize?, resume?, localeGate?, faults?, telemetryEndpoint? }): Kernel

Kernel = {
  telemetry, catalog, packs, corpus, formation, strings, preferences, bookmarks,
  partners, transfer, share, media, player,
  journal: { read(since?), stats(), export() },
  start(), resume(), snapshot(), redo(event),
}
```

One composition root. The phone calls it once with platform adapters, from `app/_layout.tsx`. The sim calls it many times with memory adapters. Nothing else constructs a module. This is the single fact an agent needs to hold: everything the app can do is a call on the kernel, and everything the app has done is in its journal.

The controls: `start()` runs the migrations, reads the journal and journals `AppOpened`; `resume()` journals `AppOpened` for a new day when the app returns to the foreground on a day that has none yet (PA-2 counts days of use), and does nothing otherwise; `snapshot()` folds every module; `redo(event)` replays one journaled event (DX-3). The options: `migrations` (discovered by reserved location, never listed), the journal's bound and tail size, a journal to resume, and `localeGate`, which is the release gate `reviewed` unless a caller passes `drafts` (the sim and the web render harness do, so the drafted locales run before a native speaker signs them off; issue #51); and `faults`, the platform faults of boot attempts that failed before a kernel existed, which `start()` journals as `Failure` events with a code and a step, before `AppOpened` (`createStartFaults` in `src/lib/faults.ts`; the iCloud backup exclusion's fault carries the step `backup`; issue #64); and `telemetryEndpoint`, the one address the counts may be sent to, which the root layout passes from `telemetryEndpoint` in `src/lib/network.ts` (unset today, so nothing is sent; issue #52). A native build reads its gate from `extra.localeGate` in the app config, `drafts` only when it was built with `UW_LOCALE_GATE=drafts`, as the device CI is (`docs/proposals/2026-09-30-ci-drafts-gate.md`).

## Ports

Every port has exactly two adapters, platform and memory, so every seam is real. Ports are the only place the kernel touches the world. There are eleven (`Ports` in `src/lib/ports.ts`).

| Port | Provides | Memory adapter |
|---|---|---|
| Clock | `now`, `dayOf` | settable, advanceable |
| Ids | `next` | sequential |
| Files | read, write, append, list, rename, remove, adopt an external file, free space, and `uriOf(path)`, the media address of a file | in-memory tree |
| Db | SQL over the device database, with transactions | SQLite through an injected engine (ADR 0011) |
| Kv | preferences: get, set, delete, keys | map |
| Http | request and download with timeout, host allowlist, progress, cancel, offline signal; `POST` with a body only to the telemetry endpoint | fixture responses, scripted outages, the requests sent |
| Transport | availability, advertise under a pairing code (with an address), discover, connect, a link of byte chunks, the Android app package and `install(path)` | a shared in-memory bus between sim devices |
| Audio | `load(source)`, `play`, `pause`, `seek`, `status`, `unload` | scripted clock |
| ShareSheet | hand a payload with provenance to the system | records payloads |
| Picker | `pickArchive()`: ask the system for a burrito file | scripted picks, cancels and failures |
| Locale | device locale, region, time zone, direction | settable |

The Transport platform adapter is `react-native-tcp-socket` for the stream and the local module `modules/uw-radio/` for mDNS, the local address and the installer hand-off (ADR 0013); it has not run on a phone. The Audio source is a file on the device: audio is download-only and plays from an Audio Pack (ST-4, issue #53); a URL source was removed with that decision.

Determinism follows: with Clock and Ids injected, a scenario reproduces byte for byte, and a journal shared from a phone replays in the sim to the same snapshot.

**The web render harness is not a third adapter set** (ADR 0008). `npm run shots` exports the real app for the web and photographs every screen in Chromium. On web Metro picks `src/platform/ports.web.ts`, a one-line re-export of `@sim/web/ports`, which builds the Ports from the memory adapters and the sim's pinned Clock and Ids, restores a device image the sim wrote in Node, and makes Files, Kv, Db and Http wait for it; it passes the `drafts` locale gate so the right-to-left and script modes render their drafted locales. The memory Db adapter takes its SQL engine, `node:sqlite` in Node and sql.js in the browser (ADR 0011). `npm run bundle` fails if any module from `sim/`, `scripts/`, sql.js or react-native-web reaches an iOS or Android bundle. The other visual check is the device CI, `.github/workflows/device.yml`: release builds on an Android emulator and an iOS simulator driven by the Maestro flows in `device/flows`.

## Modules

Each is a deep module: small interface, tests at the interface, internals free to change. Interfaces below are the core of what a caller learns; the types in each module's file are the whole of it. Every module is `defineModule({ events, owns, create })`, and the rules it follows for replay are in [`replay.md`](replay.md).

**Catalog.** `refresh()`, `languages()`, `releases(language)`, `search(query)`, `originals()`. Reads Door43's catalog through Http and normalizes it into releases, each carrying the URL of its generated Scripture Burrito archive; names languages in English from the DCS languages list. The only module that knows Door43's shape.

**Packs.** `install(source, plan)`, `installFromCatalog`, `importFile(uri)`, `importPicked()`, `update`, `remove(pack)`, `installed()`, `updates()`, `status(language)`, `storage()`, `defaults`, `optional`, `installOptional`, `confirmReplace()`, `declineReplace()`. One install path for all three sources: `fromCatalog(release)`, `fromPeer(delivery)`, `fromFile(path)` (ADR 0005). Writes beside, verifies checksums against the burrito metadata, renames over. The old pack is readable until the new one is complete. Owner of every pack directory. Each install unpacks its burritos, streamed from the archive, into a directory of its own, `packs/{kind}/{language or pack}/{install}/{publisher}/{resource}`; a burrito an update keeps stays where it is. The `packs` row in the database is the commit point: a directory no row names is garbage, removed on the next start, and the directories an update replaced are removed only after `PackInstalled` has been read by Corpus. Corpus, on start, reads the installed packs through Packs' `readInstalledPacks` and catches up with any it has not read. The text row of a Language Pack is required; a failed optional burrito leaves a partial pack naming the failed release. The Image Pack and Audio Packs are app-written burritos around catalog assets (ADR 0006). Each installed burrito records its source; a peer or file burrito that would replace a catalog one with a different commit installs nothing until the leader confirms (`pack.replace-unconfirmed`, issue #22).

**Corpus.** `passage(reference)`, `article(id)`, `story(n)`, `movements(story)`, `contents(language)`, `search(query)`, `fullText(query)`, `reindex()`, `attachment`. Every content value returned carries provenance as a required field; there is no way to get content out without it. A title or book name (`title`, `bookName`, `referenceName`, the contents lists) is a label and carries none (CONTEXT.md). The only module that parses USFM, TSV and Markdown.

**Formation.** `tracks(language)`, `session(track, n)`, `groups()`, `create(group)`, `rename`, `remove`, `activate`, `advance(group, step)`, `start`, `complete`, `note`, `saveNote`. A state machine over positions. Language fallback (plain stories when movements are absent, English movements alongside when asked) is decided here, once.

**Transfer.** Sender: `offer(plan)` advertises under a short code, `run(transfer)` sends what the receiver accepts. Receiver: `discover()`, `connect(peer)` (or `connectAt(address, code)` for a typed or scanned address) sends the pairing code and shows the offer, `accept(selection)` receives and verifies every archive and returns a peer delivery (`PeerDelivery`) that hands Packs each archive as the file it was received into (`{ ok: true, path }`), never its bytes; then it is just `packs.install(fromPeer(delivery))`. Either side: `cancel()`, `current()`, `decline()`. On Android the receiver hands a received app package to the system installer with `installApp()`, and journals `AppInstallerOpened` once the installer is open. A state machine over the Transport port, speaking a small versioned protocol (`src/lib/transfer/protocol.ts`). Carries burritos, and on Android the app package.

**Share.** `passage(passage)`, `story(story)`, `audio(clip)`, `journal(report)`, each with the locale for its words. Builds payloads with provenance and the link from content the corpus already returned, hands them to ShareSheet. `journal(report)` shares the diagnostics file; by default it leaves out what the leader read (the `reference`, `article` and `story` fields of the opening events, and bookmarks), keeping every event, unless the leader turns on "Include what I read" for that one share (issue #20, `replay.md`).

**Strings.** `t(key, locale, params)`, `plural(key, n, locale)`, `direction(locale)`, `resolveLocale(tags)`, `words(locale)`, `completeness()`. The one string table. A sentence a module produces is a code; a screen words it. Only the locales the locale gate admits are offered.

**Telemetry.** `counts()`, `leaving()`, `daysOfUse()`, `sending()`, `send()`. Folds over events; `leaving()` is exactly the PRD 9 list. `send()` posts one batch a day when online, the counts no earlier batch carried, to the telemetry endpoint and nowhere else, and journals `TelemetrySent` or a `Failure`; with no endpoint set it makes no request (issue #52, `docs/proposals/2026-09-30-telemetry-sender.md`). v1.0.0 sent nothing (ADR 0012).

**Preferences, Bookmarks, Partners.** The preference-shaped owners (ADR 0007). `preferences` owns the closed list of preference keys and the last passage per language (`get`, `set`, `locale`, `contentLanguage`, `lastPassage`, `onChange`); `bookmarks` owns the `bookmarks` table (`list`, `find`, `add`, `remove`, `onChange`); `partners` owns the invitation schedule, the cached impact stories and their images (`invitation`, `shown`, `tap`, `dismiss`, `stories`, `open`, `refresh`, `give`). Each has an `owns` export, one writer, `redo` handlers and a snapshot that identifies no one.

**Media.** `uriOf(path)`: the media address of a picture under `packs/` or `partners/images/`, from `Files.uriOf`. Owns nothing (ADR 0009).

**Player.** `load(clip)`, `play`, `pause`, `seek`, `stop`, `status`, `subscribe`. The one audio player over the Audio port; one clip at a time, files under `packs/` only. Owns nothing, emits no event but a `Failure` with step `audio` (ADR 0010).

**Journal.** `read(since)`, `stats()`, `export()`, and appends through every module's `emit`. Bounded and append-only. Failures are events here too; this is the error channel, the telemetry source and the replay input. `export()` writes the journal half of the diagnostics file. A write a module makes happens before the event that reports it; a refused write is a `Failure` with a code, and a `Failure` is the one event that may close an id minted for a write that did not happen (`replay.md` rule 5).

Every durable value has one writer: a kernel module with an `owns` export for content, the journal and preference-shaped state; a feature `store.ts` for a value one feature alone reads and writes, once a store can reach a port (none exists today). The `owns` check fails on any table, directory or key claimed twice or written elsewhere.

## The root layout

`app/_layout.tsx` composes the kernel once and reads the rendering inputs the sim never renders, directly from React Native and Expo rather than through a port, because a memory adapter for them would do nothing:

- the colour scheme (`useColorScheme`), the reduced-blur default (`reducedBlurByDefault()`, on for Android before API 31) and Reduce Motion (`AccessibilityInfo`), each replaced by the leader's preference when one is set (`home.theme`, `settings.reducedBlur`, `settings.reducedMotion`, owned by `preferences`);
- the fonts (`useThemeFonts`) and the launch screen (`expo-splash-screen`), held until the kernel has started or failed; a failed start shows `BootFailure`, which builds its words from the string table and the phone's language tag, and Try again opens fresh ports and a fresh kernel;
- the layout direction: when the app locale's direction differs from `I18nManager.isRTL`, the layout sets `allowRTL` and `forceRTL` and reloads (`reloadAppAsync`), skipped on web;
- the foreground: `AppState` becoming `active` calls `kernel.resume()`.

Nothing it reads identifies the leader or the device. The glass primitives in `src/shared/glass` import `expo-blur` and `expo-haptics`, and `src/shared/fonts` imports `expo-font`, on the same reasoning (AGENTS.md rule 2).

## Events are the spine

Every module returns events; the kernel appends them to the journal. Modules never call each other's internals; where one needs to react to another, it reacts to an event. There are 45 (`eventSchemas` in `src/lib/domain/events.ts`), each with a replay class (`redo`, `follows` or `verbatim`, `replay.md`):

```
AppOpened   Failure(code, context)
CatalogRefreshStarted   CatalogRefreshed
PackInstallStarted   PackInstallProgressed   PackInstalled   PackResourceFailed   PackFailed   PackRemoved
PassageOpened   ArticleOpened   StoryOpened   SearchRun   IndexStarted   IndexBuilt   IndexDropped
GroupCreated   GroupRenamed   GroupDeleted   GroupActivated   PositionChanged
SessionStarted   MovementCompleted   SessionCompleted   SessionNoteSaved   LessonCompleted
TransferOffered   TransferAccepted   TransferProgressed   TransferCompleted   TransferFailed   AppInstallerOpened
ImportReceived   ShareSent   BookmarkAdded   BookmarkRemoved   PreferenceChanged   TelemetrySent
InvitationShown   InvitationTapped   InvitationDismissed
ImpactStoryOpened   ImpactStoriesRefreshStarted   ImpactStoriesRefreshed
```

Three things derive from the journal by pure folds, so none needs its own bookkeeping:

- **Telemetry** is a count over events, computed on the device. Adding a count is adding a fold, and PRD section 9 lists which folds exist. What has been sent is a fold too, over `TelemetrySent`, so a batch is the difference. v1.0.0 sent nothing (ADR 0012); v1.1.0 sends only once an endpoint is set.
- **Snapshot** is the fold of the modules plus the journal tail.
- **Replay** is the journal fed back through the kernel on memory adapters. A diagnostics file that leaves out what the leader read still replays, except bookmarks and the last passage (the three opening events' fields are optional for that reason); it keeps each time only to its UTC day so the time zone cannot be read from it (`replay.md`, issue #24).

## The sim

`sim/` is where the app is driven. It is not a test double for the app; it is the app on memory adapters.

- `createSimDevice(fixture)` returns a kernel plus the feature services.
- `createWorld()` holds any number of devices, a fixture catalog served through the memory Http adapter, and one shared Transport bus.
- Scenarios in `sim/scenarios/` are named for the requirement they prove: `SH-1.transfer-ios-to-android.ts`, `FO-5.fallback-without-movements.ts`. A scenario is ordinary code against the kernel; its assertions are on the snapshot and the journal.
- The fixture language `qaa` has a real burrito of every flavor the content contract admits, small enough to live in the repository: two short books, three stories with images, a handful of Word and Academy articles, notes, questions and word links for those books, and one audio file. `qab` has stories and no movements, for the fallback path.

The cockpit:

```
npm run sim -- <scenario>        run one scenario and print its snapshot and journal
npm run sim -- all               every scenario
npm run replay -- <journal.json> rebuild a device from a shared diagnostics file, print the snapshot
npm run trace                    Must requirement IDs against scenarios and tests (--enforce): fails on any without one
npm run contract                 validate every fixture burrito, and a live release when online
npm run verify                   lint and format, typecheck (including lib with no DOM), test, knip, checks, every scenario, trace, contract, bundle
```

`npm run bundle`, the last step of `verify`, runs `expo export` for Android and iOS with source maps and fails if any module from `sim/`, `scripts/`, sql.js or react-native-web reached either bundle. `npm run shots` (not in `verify`; `.github/workflows/shots.yml` runs it on every pull request) photographs every screen through the web render harness, and `.github/workflows/device.yml` runs the Maestro flows in `device/flows` on an Android emulator and an iOS simulator.

A phone is touched for three things only: the platform adapters, the glass rendering, and the radios. Everything else is proven in the sim first, and the sim is what an agent reads when something is wrong.

## Every rule is a check

A rule that lives only in prose drifts. Each of these has a check in `verify` and in CI, and the scaffold PR is accepted only when each has been observed red once.

| Rule | Check |
|---|---|
| Imports go down the tower only | ESLint `no-restricted-imports` over aliases and relative paths |
| A feature sees only the kernel's public surface | the `features` lint layer admits from `src/lib` only `@lib/kernel`, `@lib/domain/*` and a module's types file, `@lib/<module>/types` (which re-exports the wire and result types and the pure helpers a service may use), and `@lib/module` and `@lib/written` as types only |
| `lib/` is pure | `no-restricted-globals` in `src/lib/**`, plus `tsconfig.lib.json` with no DOM or React Native types |
| No code comments | lint rule over `src/`, `app/`, `sim/`, `tests/` |
| One writer per durable value | the `owns` check walks every kernel module's and feature `store.ts`'s `owns` export and fails on any table, directory or key claimed twice, on a table a migration creates that no one owns, and on SQL in `src/` that writes a table outside its owner's folder. A table name in a write must be a literal: an interpolated or concatenated one fails unless `scripts/checks/owns.check.ts` admits that file and expression with the tables it ranges over (the migrations table and the full-text tables today), and those tables are checked against their owner too. Directories and keys are checked statically only for double claims; that a module writes only its own is enforced at runtime, where `scopedDb`, `scopedFiles` and `scopedKv` (`src/lib/scope.ts`) refuse a foreign write with `kernel.not-owned` |
| Provenance on every content value | the Corpus types make it a required field; the `provenance` check renders every fixture value, finds the licence, and exempts titles in `words`, `academy` and `stories` as labels by name (`CONTEXT.md`, Label) |
| No network except allowlisted hosts | the Http port refuses other hosts and any `POST` but the one to the telemetry endpoint, and `src/lib` may not name `fetch`, `XMLHttpRequest` or `WebSocket`; the `network` check refuses a runtime dependency on a known network client or a reporting SDK anywhere in production, and scans every production package in `node_modules` for `fetch(`, `XMLHttpRequest`, `new WebSocket(`, `EventSource`, Node's socket modules and JVM, Apple and BSD socket calls, failing on any package with a hit that `scripts/checks/sockets-admitted.ts` does not admit by name, signal and reason. It is a text scan: it finds code that can open a connection, not proof that it does |
| Tokens agree | `src/shared/theme` is compared to `design-system/tokens/*.css` by name and value |
| Strings live in one table | the `strings` check: every locale lists every key, the copy follows the voice rules, and no literal copy in `app/`, `src/features/` or `src/shared/` bypasses the table (JSX text and copy props everywhere, and prose literals in every file of `app/` and `src/features/`, services included; string keys, failure codes, preference keys and addresses are names, not copy); `locale-signoff`: the sign-off table and `localeSignOffs` agree |
| Nothing unused | knip over files, dependencies, exports and types |
| Every Must requirement is proven | `trace --enforce` fails on a Must ID with no scenario named for it, unless the ID is on the documented list in `sim/trace.ts` and a test names it (SE-2, PRD DX-4); the DX-4 scenario runs the same check |
| No harness module in a phone bundle, no drafted locale in a release | `bundle` exports Android and iOS with source maps and fails on any module from `sim/`, `scripts/`, sql.js or react-native-web; before that it fails unless the app config built without `UW_LOCALE_GATE` embeds the `reviewed` gate, the flag still yields `drafts`, and no `eas.json` profile sets it |
| This page matches the tree | the `architecture` check fails when the module, port or event count stated here, or the modules, ports and events listed here, differ from `kernelModules`, `Ports` and `eventSchemas` |
| No permission merged past the admitted list | the device CI's Android job diffs `aapt2 dump permissions` of the built APK against `scripts/checks/android-permissions.ts` (`scripts/apk-permissions.ts`) and fails on a permission neither admitted nor the app's own receiver permission, and on a blocked one a Maven dependency merged back |
| Content matches the contract | `contract` validates every fixture burrito against `docs/content-contract.md` |

## Where a change goes

| Change | Place |
|---|---|
| A new resource flavor | `docs/content-contract.md`, then Corpus, then a fixture burrito |
| A new screen | one feature folder, one route line, one scenario |
| A new durable value | the kernel module that owns its kind and its `owns` export (a new preference key: `preferences`); a feature `store.ts` only for a value one feature alone reads and writes |
| A new thing the world must provide | a port with both adapters, never a direct import |
| A new count for partners | a fold over events, plus the PRD list and the privacy screen |
| A new word | `CONTEXT.md` first |
| A reason the next reader will not guess | `docs/adr/` |
