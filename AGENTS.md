# AGENTS.md

Rules for AI coding agents working in this repository. Read this whole file before
your first edit. Every rule here exists because an agent without it will take the
shortcut it describes.

## 0. The tower of documents

Each document has one job. Load the one the task needs; do not restate one inside
another.

| Read | For |
|---|---|
| [`CONTEXT.md`](CONTEXT.md) | The words. Every module, test, screen and document uses these and no synonyms |
| [`docs/architecture.md`](docs/architecture.md) | The shape: kernel, ports, modules, events, the sim, the checks |
| [`docs/PRD.md`](docs/PRD.md) | What to build and why. Requirement IDs (`ST-3`, `SH-1`) are stable; cite them |
| [`docs/content-contract.md`](docs/content-contract.md) | What content the app accepts and produces, with the validator both sides run |
| [`docs/adr/`](docs/adr/) | Why the shape is this way. Read before proposing to change it |
| [`design-system/`](design-system/HANDOFF.md) | Tokens, glass primitives and the clickable prototype |
| `docs/progress_tracker.md` | What actually ran, append-only, newest first |
| `docs/exceptions.md`, `docs/proposals/` | Recorded exceptions to the rules; proposals to change shared roots |

Where the PRD and this file disagree, the PRD wins on what and this file wins on how.

## 1. Fixed decisions

These are settled. Work inside them; open a proposal (section 8) to change one.

| Concern | Decision |
|---|---|
| Language | TypeScript, `strict: true`, no `any`, no `// @ts-ignore` |
| Platform | Native iOS and Android through Expo and React Native; EAS builds and submits |
| Shape | One pure kernel over ports, with a platform adapter and a memory adapter per port; the sim drives the kernel in Node (ADR 0001) |
| Routing | Expo Router, file-based under `app/`; route files are one-line re-exports of a feature screen |
| Content format | Scripture Burrito, read and written natively; Resource Containers are never parsed here (ADR 0002) |
| Content source | Door43 Content Service catalog: production stage, `tc-ready` topic, any publisher; unfoldingWord first within a language |
| Storage | On the device only: SQLite for structured data, the file system for packs, a key-value store for preferences (ADR 0004) |
| Accounts, backend | None (ADR 0004) |
| Observability | Events into a bounded journal on the device; telemetry, snapshot and replay are folds over it (ADR 0003) |
| Analytics | Anonymous aggregate counts only, the list in PRD section 9, each a fold over events |
| Design | Generative Glass design system in `design-system/`: tokens, glass primitives and the prototype. Light and dark following the system setting, user override persisted |
| Localization | The 16 locales registered in `unfoldingWord/obs-website`, English fallback string by string, RTL first-class |
| Package manager | npm, matching `unfoldingWord/obs-app` |
| Tests | Vitest in Node: scenarios in `sim/scenarios/` named for requirement IDs, plus tests at each module's interface; device runs recorded in `docs/progress_tracker.md` |
| Lint / format | ESLint and Prettier, run by `npm run check`; the full chain is `npm run verify` |
| Code comments | None. Meaning lives in names, types, tests and `docs/`, never in a comment |
| File length | Under 1000 lines |

The scaffold is the first PR. Its acceptance criterion is that every check in
`docs/architecture.md` ("Every rule is a check") exists and has been observed red
once, and that `npm run sim -- all` runs the fixture language end to end.

## 2. The cockpit

The commands an agent drives the system with. Until the scaffold lands they are
the contract for what it must provide.

```
npm run sim -- <scenario>         run one scenario; print the snapshot and journal
npm run sim -- all                every scenario
npm run replay -- <journal.json>  rebuild a device from an exported journal
npm run trace                     Must requirement IDs with no scenario and no test
npm run contract                  validate fixture burritos, and a live release when online
npm run check                     lint and format
npm run verify                    the whole chain, the same one CI runs
```

Start from the sim. A phone is for three things: platform adapters, glass
rendering and radios. If a question can be answered by a scenario, a snapshot or a
journal, it is answered there first.

## 3. Device primitives

Every port has one platform adapter under `src/platform/` and one memory adapter
under `sim/adapters/`. The table names the Expo module behind the platform
adapter; versions live in `package.json`.

| Port | Platform adapter | Notes |
|---|---|---|
| Files | expo-file-system | Packs under a per-language directory; replaced by rename, never in place |
| Db | expo-sqlite | Migrations in `migrations/`; schema changes go through a migration file only |
| Kv | expo-sqlite key-value or MMKV | One writer per key (rule 3) |
| Http | fetch behind `src/platform/http.ts` | Timeout, host allowlist and offline signal in one place |
| Transport | **open: proposal required** | Constraint: iOS to Android both ways, no network. The memory adapter exists first; the spike picks the radio |
| Audio | expo-audio | Streams online, plays a downloaded file offline |
| ShareSheet | expo-sharing and the RN `Share` API | Provenance attached to every payload |
| Locale | expo-localization | Region for the invitation comes from here, never from location |
| Clock, Ids | `Date.now`, `crypto.randomUUID` | Injected so the sim can pin them |
| Screens and navigation | Expo Router | Tabs: Home, Study, Formation. Languages is a modal route |
| Blur | expo-blur | With a reduced-blur mode for low-end Android |
| Fonts | expo-font | Inter, Nunito Sans, PT Serif and the Noto script fallbacks from `design-system/assets/fonts/`, nothing else. A new script means a new Noto row in the tokens, never a different family |
| Haptics | expo-haptics | On press only |
| Native modules outside Expo | **proposal required** | A module without an Expo config plugin is an architecture change |

Location, contacts, accounts, push notifications and any SDK that reports to a
third party are out of scope until a proposal admits them. Expect the proposal to
be refused.

## 4. The contract

A coding agent optimizes for what fits in its context. Left alone it will:

- copy the nearest working pattern;
- edit the file already open;
- choose the shortest path that compiles;
- avoid deleting code whose callers are not visible;
- follow the requested implementation even when it conflicts with a system invariant;
- claim a verification it did not perform;
- reach for a phone when the sim would have answered.

These behaviors are predictable inputs. The repository is shaped so that the
conventional path is also the shortest one. Five rules carry that shape.

## 5. The five rules

### Rule 1. The conventional path requires fewer decisions than a shortcut

Every kind of work has one template. Copy the template, fill the blanks, stop.

- New feature: copy `src/features/_template/` to `src/features/<name>/`.
- New screen: add `src/features/<name>/screens/<Name>Screen.tsx` and a one-line
  route file under `app/`.
- New durable value: add it to `src/features/<name>/store.ts` and its `owns` export.
- New kernel behaviour: a function on the owning module's interface, a test at that
  interface, a scenario named for the requirement.
- New port: `ports.ts`, then both adapters in the same PR, never one.
- New content flavor: a row in `docs/content-contract.md`, a fixture burrito, then Corpus.
- New event: the union in `lib/domain/events.ts`; the folds that should count it.
- New string: the English table by area in `src/lib/strings/en/`; every locale file in `src/lib/strings/locales/` gets the key.
- New word: `CONTEXT.md` first.

If the work does not fit a template, that is a proposal (section 8), not an
improvisation.

### Rule 2. Forbidden dependencies fail mechanically

The build enforces these. A violation is a red build, not a review comment.

- `src/lib/*` imports nothing from React, React Native, Expo or the platform. It is
  pure TypeScript and runs in plain Node. This is what lets the sim exist.
- `src/features/*` never imports another feature. Shared code moves to `src/shared/`.
- `src/shared/*` never imports from `src/features/*`.
- `src/platform/*` never imports application code.
- Application code reaches a device API only through a port; nothing outside
  `src/platform/*` and `sim/adapters/*` implements one.
- Screens never call the kernel or a port directly; they call a feature's `service.ts`.
- `sim/*` imports `src/lib/*` and `src/features/*/service.ts` and nothing else.

Enforced by ESLint `no-restricted-imports` (aliases and relative paths),
`no-restricted-globals` in `src/lib/**`, and a `tsconfig.lib.json` with no DOM or
React Native types. When you hit the wall, the fix is to move the code, not to
relax the rule.

### Rule 3. Every durable value has one obvious writer

A durable value is anything in SQLite, the file system, or the preferences store.

- Each value is written by exactly one module: a kernel module for content and
  journal, the owning feature's `store.ts` for preference-shaped state.
- Every other module reads through the owner's exported functions.
- The writer exports an `owns` constant listing every table, directory and
  preference key it owns; a check fails on any value claimed twice or written
  elsewhere.
- A pack is replaced atomically: write beside, verify, rename over.

### Rule 4. New product work adds isolated files rather than branches in shared roots

Adding a feature means adding a folder, and touching shared roots only at reserved
discovery points.

- Discovery is by reserved filename, never by editing a central registry.
  `store.ts`, `service.ts`, `screens/`, `strings.ts` and `migrations/` in a feature
  folder are picked up automatically by `src/platform/`.
- Changes to `src/lib/kernel.ts`, `src/lib/ports.ts`, `src/lib/domain/*`,
  `src/platform/`, `src/shared/`, `app/_layout.tsx`, `app.config.*`, `eas.json`, or
  the root layout are architecture changes and need a proposal (section 8).
- `design-system/` is edited in Claude Design and synced here (`design-system/github.md`
  records each sync). A code PR reads it and never hand-edits it.
- An `if (featureName)` branch in shared code is the smell this rule forbids.

### Rule 5. Exceptions are narrow, explicit, and reviewed as architecture changes

- Every exception to rules 1 to 4 is recorded in `docs/exceptions.md` with: the rule
  broken, the file, why the rule cannot hold here, and the date.
- An exception without an entry is a defect.
- The entry is written before the code, in the same commit.

## 6. Prefer open source over custom code

Before writing a utility, a component, a parser, or a client, search for an existing
package. Reach for custom code only when no maintained package does the job.

Choose a package that:

- has a permissive license (MIT, Apache-2.0, BSD, ISC, OFL for fonts);
- runs on React Native and Hermes, and, for anything under `src/lib`, in plain Node;
- needs no native code, or ships an Expo config plugin;
- works offline and never reports to a third party on its own;
- is typed (ships `.d.ts` or is written in TypeScript);
- is maintained (a release or commit within the last twelve months).

Record every new dependency in the PR description with one line: what it replaces.
Scripture Burrito, USFM and TSV parsing start from the unfoldingWord and Door43
ecosystem packages before anything is written fresh.

## 7. UI rules

The interface is calm glass: one job per screen, few controls, content
bottom-weighted, nothing sharp.

- Before any UI work, read `design-system/SKILL.md`, then `design-system/readme.md`,
  then the screen you are building in
  `design-system/templates/uw-resources-app/UwResourcesApp.dc.html`. Its
  `HANDOFF.md` maps PRD requirement IDs to screens.
- `design-system/tokens/*.css` is the source of truth for every value. The app's theme
  module in `src/shared/theme/` mirrors those tokens by name, and a check asserts the
  two agree. A value that is not in the tokens is a design change, not a code change.
- The React Native primitives keep the names and props of
  `design-system/components/glass/*.d.ts`. Reading the `.prompt.md` beside each one
  is part of building it.
- Every screen renders correctly in light, dark and reduced-blur mode. Test all
  three before done.
- Use the glass primitives (surface, button, icon button, input, chip, ring, aurora
  field) before composing raw styles.
- Layout works at 360px width, with dynamic type at the platform maximum, and in
  RTL for Arabic, Urdu and Farsi.
- Interactive elements are full pills with visible focus and an accessible name.
- Copy is sentence case, second person, one sentence of support, no exclamation
  marks, no emoji. `unfoldingWord` is camelCase every time. Spell out "and". There
  is no red; Kindle carries warnings.
- Every screen works with no connection after the initial download. Design the
  empty, offline and not-yet-downloaded states first.
- A screen is a function of the kernel's state. If a screen needs something the
  snapshot does not show, the kernel is missing a fact, and that is where it goes.

## 8. Working steps

Do these in order for every task.

1. **Orient.** Read the task, then the PRD requirements it cites, then `CONTEXT.md`
   for the words, then the feature folder it touches. Read `docs/exceptions.md`.
   State in one line which template (rule 1) applies.
2. **Search for prior decisions.** Grep for the feature name, the durable values and
   the events involved. Find the existing writer (rule 3) before adding one. Check
   the PRD decision log and `docs/adr/` before reopening a settled question.
3. **Plan the files.** List every file you will add or edit. If any is a shared root
   (rule 4), stop and write a proposal (section 9).
4. **Write the scenario first.** For a requirement, the scenario in `sim/scenarios/`
   that proves it, observed red. For a bug, the scenario that reproduces it from a
   journal or by hand, observed red. Only then implement.
5. **Implement.** Copy the template. Fill it. Keep each file under 1000 lines.
6. **Verify.** `npm run verify` green. If a screen changed, load it in light, dark and
   reduced-blur. If a platform adapter or the radios changed, run it on a phone and
   record the run in `docs/progress_tracker.md`. Paste the command output in your
   summary.
7. **Report.** Summarize what changed, what you verified, and what you did not verify.
   Label inferences as inferences. If you could not verify something, say so first.

Done means: all seven steps completed, `npm run verify` green, no file outside the
feature folder changed without a proposal, no exception missing its entry, no Must
requirement touched without its scenario, and no claim of verification standing
without the run behind it.

## 9. Proposals

A proposal is a short markdown file in `docs/proposals/<date>-<slug>.md` with four
headings: Problem, Change, Alternatives, Rules affected. Write it, stop, and ask a
human to approve before touching shared roots. A proposal does not need to be long.
It needs to be reviewable. If it is accepted and it is hard to reverse, surprising
without context and the result of a real trade-off, it also becomes an ADR.

## 10. Things that always hold

- Nothing identifies the leader or the device. No identifier, fingerprint, location,
  contacts or accounts access, ever. A dependency that phones home fails review.
- The only network calls are through the Http port to allowlisted hosts, with a
  timeout, a non-2xx path and a defined offline behavior.
- Content enters the app only as a burrito from the catalog, a peer or a file, and
  every piece carries provenance from the moment it is parsed until it leaves.
- Everything that happens is an event in the journal. A failure is an event with a
  code; screens show it as state in place on the control that failed, never as raw
  exception text. The journal leaves the device only through Share.
- A control goes busy before the first `await` in its handler.
- An async re-read never overwrites a known value with a stale or unknown one.
- Code carries no comments: no line comments, no block comments, no JSDoc, no
  directive comments, no commented-out code. What a comment would have said goes
  into a name, a type, a test, or `docs/`. A lint rule enforces this on `src/`,
  `app/`, `sim/` and `tests/`; licence texts live in their own files under `licenses/`.
- Deleting code with no visible callers is allowed once a grep of the repo confirms
  zero references. Say that you grepped.
- Commits follow `unfoldingWord/uw-dev-skills`: Conventional Commits, an agent as
  sole author with no attribution footer, hooks always pass, `--no-verify` unused,
  and no merge to `main` without a human's explicit permission.
- When the requested implementation conflicts with a rule in this file, the rule
  wins. Say so, then propose.
