# Partial language packs that name the failed release

Status: approved in issue #10 (the issue's Decision is the requirements owner's approval).

## Problem

On live DCS, `installFromCatalog('language:en')` fails in 43 ms with `http.status` and installs nothing: the
formation row maps to the language pack, `defaultReleases` includes `en_obs-tf@v4`, whose `sb` archive returns
HTTP 500, and the installer threw on the first failed fetch. Indonesian fails the same way. The leader saw "The
library did not answer as expected" and nothing said which resource failed.

## Change

- The text resources of a language pack (the `text` row: Literal and Simplified text) are required; every other
  resource is optional. Only for a catalog install of a language pack: required offers are fetched first, a
  failed required offer fails the install, a failed optional offer is recorded and skipped. A no-space failure
  still fails the whole install, and so does an install in which every offer failed.
- `PackInstalled` gains `failed`, an optional list of `{ publisher, resource, language, tag, code }`.
  `PackFailed` gains optional `publisher`, `resource` and `tag`, the release whose failure ended the install.
  `src/lib/domain/events.ts` gains an optional list field (`optional: true` on a list spec), so journals written
  before this change still validate.
- The pack is recorded as partial by what it lacks: `status(language).missing` already lists default releases
  not installed, so HO-5 counts the pack as incomplete. `status(language).failed` names the failure code of each
  missing release from the last attempt (kept in memory, in the packs snapshot, and in the journal).
- The Languages screen shows a "Not yet on this phone" section for the current language: each missing resource
  with its publisher and version, its failure in place, and one Try again that installs only what is missing.
- Rows with no source are excluded from `defaultReleases` (`rowsAwaitingSource = ['formation']` in
  `src/lib/packs/plan.ts`) until DCS generates the archive. Formation is installed only when asked for:
  `installFromCatalog(pack, { withRows: ['formation'] })`, which the Formation service uses for its download, and
  `installOptional(pack, release)` from the library.

## Alternatives

- **Install optional burritos in a second, separate install.** Two events per tap and two progress bars for one
  action; LA-2 asks for one action.
- **Keep formation in the default pack.** Every English and Indonesian install would be partial on live DCS until
  the archive is fixed, and would retry a known 500 on every tap.
- **A durable failed-release table.** The catalog already makes "missing" durable; only the failure code is lost
  on restart, and Retry does not need it.

## Rules affected

- Rule 4: `src/lib/domain/events.ts` is a shared root; changed here under the approval in issue #10.
- No exception to rules 1 to 3.
