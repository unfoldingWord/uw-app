# AGENTS.md

Rules for AI coding agents working in this repository. Read this whole file before
your first edit. Every rule here exists because an agent without it will take the
shortcut it describes.

The product is defined in [`docs/PRD.md`](docs/PRD.md). Requirement IDs there
(`ST-3`, `SH-1`) are stable; cite them instead of paraphrasing. Where this file
and the PRD disagree, the PRD wins on what to build and this file wins on how.

## 1. Fixed decisions

These are settled. Work inside them; open a proposal (section 8) to change one.

| Concern | Decision |
|---|---|
| Language | TypeScript, `strict: true`, no `any`, no `// @ts-ignore` |
| Platform | Native iOS and Android through Expo and React Native; EAS builds and submits |
| Routing | Expo Router, file-based under `app/`; route files are one-line re-exports of a feature screen |
| Content format | Scripture Burrito, read and written natively. Resource Containers are never parsed here |
| Content source | Door43 Content Service catalog: production stage, `tc-ready` topic, any publisher; unfoldingWord first within a language |
| Storage | On the device only: SQLite for structured data, the file system for packs, a key-value store for preferences. No server-side user state |
| Accounts | None. No sign-in surface exists |
| Analytics | Anonymous aggregate counts only, the list in PRD section 9, self-hosted. No third-party analytics or crash SDK |
| Design | Generative Glass design system; light and dark following the system setting, user override persisted |
| Localization | The 16 locales registered in `unfoldingWord/obs-website`, English fallback string by string, RTL first-class |
| Package manager | npm, matching `unfoldingWord/obs-app` |
| Tests | Vitest in Node for `src/lib` and `src/features/*/service.ts`; device runs recorded in `docs/progress_tracker.md` |
| Lint / format | ESLint and Prettier, run by `npm run check` |
| Code comments | None. Meaning lives in names, types and tests, never in a comment |

The scaffold is the first PR. Its acceptance criterion is that every mechanical
enforcement named in this file exists and has been observed red once.

## 2. Device primitives

Use the platform instead of writing infrastructure. Pick from this table; each row
names the one module for that job. Versions live in `package.json`, not here.

| Need | Use | Notes |
|---|---|---|
| Screens and navigation | **Expo Router** | Tabs: Home, Study, Formation. Languages is a modal route |
| Files, packs, audio, images | **expo-file-system** | Packs under a per-language directory; swap by rename, never in place |
| Structured data: catalog, progress, groups, notes, bookmarks | **expo-sqlite** | Migrations live in `migrations/`. Schema changes go through a migration file only |
| Preferences: locale, theme, name, current language | **key-value store** (`expo-sqlite` KV or MMKV) | One writer per key (section 4, rule 3) |
| Network | **fetch** through `src/platform/http.ts` | Timeout, offline detection and non-2xx handling in one place |
| Resumable downloads | **expo-file-system** download resumable | Never a hand-rolled chunk loop |
| Audio playback | **expo-audio** | Streams online, plays a downloaded file offline |
| Share out (text, audio, bundle) | **expo-sharing** and the RN `Share` API | Attribution and licence attached to every payload |
| Receive a bundle from a file | **expo-document-picker** plus file-type intent filters | The app registers as an importer for Scripture Burrito bundles |
| Phone-to-phone transfer | **open**: proposal required | Constraint: iOS to Android both ways, no network. Spike before screens |
| Blur, translucency | **expo-blur** | With a reduced-blur mode for low-end Android |
| Fonts | **expo-font** | Licences are checked before a binary ships |
| Device locale and region | **expo-localization** | Region for the partner invitation comes from here, never from location |
| Haptics | **expo-haptics** | On press only |
| Native modules outside Expo | **proposal required** | A module without an Expo config plugin is an architecture change |

Location, contacts, accounts, push notifications and any SDK that reports to a
third party are out of scope until a proposal admits them. Expect the proposal to
be refused.

## 3. The contract

A coding agent optimizes for what fits in its context. Left alone it will:

- copy the nearest working pattern;
- edit the file already open;
- choose the shortest path that compiles;
- avoid deleting code whose callers are not visible;
- follow the requested implementation even when it conflicts with a system invariant;
- claim a verification it did not perform.

These behaviors are predictable inputs. The repository is shaped so that the
conventional path is also the shortest one. Five rules carry that shape.

## 4. The five rules

### Rule 1. The conventional path requires fewer decisions than a shortcut

Every kind of work has one template. Copy the template, fill the blanks, stop.

- New feature: copy `src/features/_template/` to `src/features/<name>/`.
- New screen: add `src/features/<name>/screens/<Name>Screen.tsx` and a one-line
  route file under `app/`.
- New durable value: add it to `src/features/<name>/store.ts`.
- New content reader (a resource type, a bundle shape): add it to `src/lib/burrito/`
  or `src/lib/parse/`, pure, with a fixture under `tests/fixtures/`.
- New string: add it to `src/lib/strings.ts`; every locale file gets the key.

If the work does not fit a template, that is a proposal (section 8), not an
improvisation.

### Rule 2. Forbidden dependencies fail mechanically

The build enforces these. A violation is a red build, not a review comment.

- `src/lib/*` imports nothing from React, React Native, Expo or the platform. It is
  pure TypeScript and runs in plain Node. This is what makes parsing, packing and the
  transfer protocol testable without a phone.
- `src/features/*` never imports another feature. Shared code moves to `src/shared/`.
- `src/shared/*` never imports from `src/features/*`.
- `src/platform/*` (Expo modules, native bindings, HTTP) never imports application
  code.
- Application code reaches a device API only through `src/platform/*`.
- Screens never call `src/platform/*` directly; they call a feature's `service.ts`.

Enforced by ESLint `no-restricted-imports` (matching `@/` aliases and relative
paths), `no-restricted-globals` in `src/lib/**`, and a `tsconfig.lib.json` with no
DOM or React Native types. When you hit the wall, the fix is to move the code, not
to relax the rule.

### Rule 3. Every durable value has one obvious writer

A durable value is anything in SQLite, the file system, or the preferences store.

- Each value is written by exactly one module: the owning feature's `store.ts`.
- Every other module reads through that feature's exported `service.ts` functions.
- The writer exports an `owns` constant listing every table, directory, and preference
  key it owns; `src/platform/` reads it at discovery.
- Two writers for one value is a bug even when both are correct.
- A pack is replaced atomically: write beside, verify, rename over. The old pack is
  readable until the new one is complete.

### Rule 4. New product work adds isolated files rather than branches in shared roots

Adding a feature means adding a folder, and touching shared roots only at reserved
discovery points.

- Discovery is by reserved filename, never by editing a central registry.
  `store.ts`, `service.ts`, `screens/`, `strings.ts` and `migrations/` in a feature
  folder are picked up automatically by `src/platform/`.
- Changes to `src/platform/`, `src/shared/`, `app/_layout.tsx`, `app.config.*`,
  `eas.json`, or the root layout are architecture changes and need a proposal
  (section 8).
- An `if (featureName)` branch in shared code is the smell this rule forbids.

### Rule 5. Exceptions are narrow, explicit, and reviewed as architecture changes

- Every exception to rules 1 to 4 is recorded in `docs/exceptions.md` with: the rule
  broken, the file, why the rule cannot hold here, and the date.
- An exception without an entry is a defect.
- The entry is written before the code, in the same commit.

## 5. Prefer open source over custom code

Before writing a utility, a component, a parser, or a client, search for an existing
package. Reach for custom code only when no maintained package does the job.

Choose a package that:

- has a permissive license (MIT, Apache-2.0, BSD, ISC);
- runs on React Native and Hermes (no Node-only APIs, no DOM assumptions);
- needs no native code, or ships an Expo config plugin;
- works offline and never reports to a third party on its own;
- is typed (ships `.d.ts` or is written in TypeScript);
- is maintained (a release or commit within the last twelve months).

Record every new dependency in the PR description with one line: what it replaces.
Scripture Burrito, USFM and TSV parsing start from the unfoldingWord and
Door43 ecosystem packages before anything is written fresh.

## 6. UI rules

The interface is calm glass: one job per screen, few controls, content
bottom-weighted, nothing sharp.

- Every screen renders correctly in light and dark mode and in reduced-blur mode.
  Test all three before done.
- Colors, radii, blur steps and motion come from the Generative Glass tokens, never
  hard-coded values in components.
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

## 7. Working steps

Do these in order for every task.

1. **Orient.** Read the task, then the PRD requirements it cites, then the feature
   folder it touches. Read `docs/exceptions.md`. State in one line which template
   (rule 1) applies.
2. **Search for prior decisions.** Grep for the feature name and the durable values
   involved. Find the existing writer (rule 3) before adding one. Check the PRD
   decision log before reopening a settled question.
3. **Plan the files.** List every file you will add or edit. If any is under
   `src/platform/`, `src/shared/`, or the root, stop and write a proposal (section 8).
4. **Implement.** Copy the template. Fill it. Keep each file under 1000 lines.
5. **Verify.** Run `npm run check` and `npm test`. Both green. If a screen changed,
   load it in light, dark and reduced-blur. If a device path changed (audio, share,
   transfer, file import), run it on a phone and record the run in
   `docs/progress_tracker.md`. Paste the command output in your summary.
6. **Report.** Summarize what changed, what you verified, and what you did not verify.
   Label inferences as inferences. If you could not verify something, say so first.

Done means: all six steps completed, `npm run check` and `npm test` pass, no file
outside the feature folder changed without a proposal, no exception is missing its
entry, and no claim of verification stands without the run behind it.

## 8. Proposals

A proposal is a short markdown file in `docs/proposals/<date>-<slug>.md` with four
headings: Problem, Change, Alternatives, Rules affected. Write it, stop, and ask a
human to approve before touching shared roots. A proposal does not need to be long.
It needs to be reviewable.

## 9. Things that always hold

- Nothing identifies the user or the device. No identifier, fingerprint, location,
  contacts or accounts access, ever. A dependency that phones home fails review.
- Every `fetch` to an external service has a timeout, handles a non-2xx response,
  and has a defined behavior when the device is offline.
- Content enters the app only from the DCS catalog or from a Scripture Burrito bundle
  the user imported or received. Every piece carries its release tag, commit,
  publisher and licence, and they travel with it when it leaves.
- Errors reaching the user are typed, written to the on-device log that the user can
  share out, and shown as state in place on the control that failed, never as raw
  exception text.
- A control goes busy before the first `await` in its handler.
- An async re-read never overwrites a known value with a stale or unknown one.
- Code carries no comments: no line comments, no block comments, no JSDoc, no
  directive comments, no commented-out code. What a comment would have said goes
  into a name, a type, a test, or `docs/`. A lint rule enforces this on `src/`,
  `app/` and `tests/`; licence texts live in their own files under `licenses/`.
- Deleting code with no visible callers is allowed once a grep of the repo confirms
  zero references. Say that you grepped.
- Commits follow `unfoldingWord/uw-dev-skills`: Conventional Commits, an agent as
  sole author with no attribution footer, hooks always pass, `--no-verify` unused,
  and no merge to `main` without a human's explicit permission.
- When the requested implementation conflicts with a rule in this file, the rule
  wins. Say so, then propose.
