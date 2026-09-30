# Preference-shaped owners move into the kernel

Status: proposed, awaiting human approval. It is implemented on the scaffold branch under the exception in
`docs/exceptions.md` (rule 1 and rule 4, `src/lib/preferences`, `src/lib/bookmarks`, `src/lib/partners`), so
T10 to T12 can build screens against it. If it is refused, the three modules move back into feature stores
and the decision below about what a store may reach has to be made another way.

Evidence labels: **checked** means read in this repository on 2026-09-29; **inference** means reasoned.

## Problem

`docs/architecture.md` says two small owners live in features: bookmarks and preferences (Home owns) and the
invitation schedule (Partners owns), each a `store.ts` with one writer. AGENTS.md rule 1 makes "add it to
`src/features/<name>/store.ts`" the template for a new durable value. Building the feature services showed
three facts that stop that shape from working as written (all **checked**):

1. **A store cannot write.** A feature service is `createXService(kernel)`: it sees the kernel's interface and
   nothing else. No port reaches a feature (rule 2), and the kernel hands scoped Kv, Db and Files only to its
   modules. A `store.ts` in a feature has no Kv to write to.
2. **A store cannot journal.** `PreferenceChanged`, `BookmarkAdded`, `BookmarkRemoved`, `InvitationShown`,
   `InvitationTapped`, `InvitationDismissed` and `ImpactStoryOpened` are in the events table, and the kernel
   refuses an emit from anything that is not a registered module owning that type. Replay (DX-3) needs a
   `redo` handler for each, and only modules have one.
3. **Every one of these values has writers and readers in several features, which may not import each other.**
   The current content language is written by Onboarding, Languages (LA-5) and the Home chip, and read by
   Home, Study, Formation and Languages. The first name is written by Onboarding and Settings and read by Home.
   The app locale is read by every feature's `strings.ts`. Bookmarks are written from Study and read and
   removed on Home. The invitation is dismissed on Home and described on About. The partner invitation also
   needs the Locale port (region and time zone) and the Http port (the impact story feed), which no feature
   can reach.

## Change

Three small kernel modules own these values. Each is a `defineModule` in its own folder with an `owns` export,
one writer per value, `redo` handlers and a snapshot that identifies no one (`docs/replay.md`).

| Module | Owns | Emits |
|---|---|---|
| `preferences` | every key in `preferenceSchemas` (`home.name`, `home.theme`, `settings.locale`, `settings.reducedBlur`, `settings.fullText`, `study.language`, `study.reading`, `formation.englishMovements`) and `study.lastPassage.<language>`, derived from `PassageOpened` | `PreferenceChanged` |
| `bookmarks` | the `bookmarks` table (`migrations/0300-bookmarks.ts`) | `BookmarkAdded`, `BookmarkRemoved` |
| `partners` | `partners.invitation`, `partners.stories` and the `partners/` directory (cached impact story images) | `InvitationShown`, `InvitationTapped`, `InvitationDismissed`, `ImpactStoryOpened`, `ImpactStoriesRefreshStarted`, `ImpactStoriesRefreshed` |

Features stay thin: `service.ts` is pure over the kernel, `strings.ts` binds the kernel's Strings to the app
locale from `preferences`. No feature has a `store.ts` today, because no value is read and written by one
feature alone and no feature can write. `scripts/checks/owns.check.ts` still walks feature stores, so a
feature that one day owns a value it alone writes can still add one, once the kernel offers stores a port.

Docs to change if accepted: the "Two smaller owners live in features" paragraph of `docs/architecture.md`, and
the "New durable value" line of AGENTS.md rule 1 ("the owning kernel module, or a feature's `store.ts` once a
store can reach a port").

## Alternatives

- **Feature stores as kernel modules found by reserved filename.** `src/platform` and the sim would discover
  `src/features/*/store.ts`, and the kernel would compose each as a module reachable by the store object.
  Refused for now: it solves facts 1 and 2 but not 3, since a feature may not import another feature's store,
  so almost every value would still have to live in the kernel. It adds a second discovery path through
  `require.context` for a set of values that is today empty.
- **A shared store in `src/shared/`.** Refused: `src/shared` may not own durable values under rule 3, the sim
  may not import it, and it still cannot reach a port.
- **Each feature reads and writes through another feature's service.** Refused: rule 2.

## Rules affected

- Rule 1 (the template for a new durable value) and rule 4 (`src/lib/kernel.ts` is a shared root): three
  entries in `kernelModules` beyond the eight architecture slots.
- `docs/architecture.md`, "Two smaller owners live in features".
- Rule 3 is kept: each value has one writer, claimed once in an `owns` export, and the owns check sees it.
