# unfoldingWord App

Every resource. Every language. One open door.

A native iOS and Android app that puts a decade of open Bible translation
resources in the hands of every church leader who needs them: offline first, no
account, free, openly licensed, and shareable phone to phone without the
internet.

## Start here

- [docs/PRD.md](docs/PRD.md): the product requirements. Vision, goals,
  non-goals, requirements by ID, content and data, design, release criteria,
  and the decision log.
- [AGENTS.md](AGENTS.md): the rules for anyone, human or agent, changing code
  in this repository. Read it in full before your first edit.
- [CONTEXT.md](CONTEXT.md): the vocabulary. One word per concept, everywhere.
- [docs/architecture.md](docs/architecture.md): the shape. One kernel over ports,
  driven headlessly in a sim, with events as the spine.
- [docs/content-contract.md](docs/content-contract.md): what content the app
  accepts and produces, and the validator both sides run.
- [docs/adr/](docs/adr/): why the shape is this way.
- [design-system/](design-system/readme.md): the Generative Glass design system,
  with tokens, glass primitives and the clickable prototype of the app. Start
  with its `HANDOFF.md`.

## Status

The first release is built end to end in the sim and bundles for both
platforms; it has not yet run on a phone. What each release criterion still
needs is in [docs/release-checklist.md](docs/release-checklist.md), and what
actually ran is in [docs/progress_tracker.md](docs/progress_tracker.md).

**Built and proven in the sim** (every Must requirement has a scenario in
`sim/scenarios/`, `npm run trace`): onboarding, Home, Study (passages with
attached helps, literal and simplified text, articles, search, the original
languages), Formation (tracks, groups, sessions with the five movements and
the fallback), Languages and downloads (language, image and audio packs,
updates, storage), share out, import from a file, the partner invitation and
impact stories, Settings, diagnostics and replay. Transfer is proven on the
sim's memory radio.

**Needs a phone:** the platform adapters, glass rendering in light, dark and
reduced blur, RTL, dynamic type, screen readers, audio, and a journal exported
from a phone replaying in the sim.

**Blocked:**

- The Transport radio: phone-to-phone transfer shows as unavailable until
  [the radio proposal](docs/proposals/2026-09-29-transport-radio.md) is
  decided and built.
- The five-movement formation content: DCS does not yet build its burrito
  archive (reported as an HTTP 500), so Formation runs on a provisional
  fixture flavor.
- Audio: DCS does not yet carry audio in burritos, so audio packs are a
  provisional flavor too, to be attached as release assets.
- iCloud backup: packs and the database sit in `Documents`, which iOS backs
  up; `modules/backup-exclusion` ([proposal](docs/proposals/2026-09-29-backup-exclusion.md))
  keeps them out but has not run on an iPhone, and that run must be recorded
  before App Store submission. Android backs nothing up and migrates nothing.
- The impact story copy and feed: communications review.
- The store listings: the app replaces the existing "unfoldingWord" records, so
  iOS keeps the bundle identifier `com.unfoldingword.iosapp`; the Android
  package and signing key wait on the Play account holder, and the short link
  domain for share-out on Product.

## The cockpit

Start from the sim. A phone is for three things: platform adapters, glass
rendering and radios.

```
npm run sim -- <scenario>         run one scenario; print the snapshot and journal
npm run sim -- all                every scenario
npm run replay -- <journal.json>  rebuild a device from a shared diagnostics file
npm run trace                     Must requirement IDs with no scenario and no test
npm run contract                  validate fixture burritos, and a live release when online
npm run check                     lint and format
npm run verify                    the whole chain, the same one CI runs
```

`npm run checks` runs the rule checks on their own (owns, network,
permissions, provenance, routes, strings, tokens), and `npm run icons` redraws
`assets/` from the logo mark and the colour tokens.

## Run on a device

Node 22 and npm; `npm ci` first. The app runs as a development build, not in
Expo Go.

- Android: Android Studio with an emulator, or a phone with USB debugging,
  then `npx expo run:android`.
- iOS: Xcode on a Mac with a simulator or a registered phone, then
  `npx expo run:ios`.

Each command runs `expo prebuild` into `android/` and `ios/` (both ignored by
git; `app.config.ts` is the only source of native configuration), builds a
debug app and starts Metro. Without a local toolchain,
`eas build --profile development` builds the same debug app on EAS (an APK for
Android, a simulator build for iOS). Record every phone run in
`docs/progress_tracker.md`.

## Release

Profiles live in `eas.json`:

| Profile | Builds | For |
|---|---|---|
| `development` | Debug APK, iOS simulator build | Working on the platform adapters |
| `preview` | Signed release APK, internal distribution | The GitHub release for sideloading (PRD section 9) and testers |
| `production` | Android app bundle and iOS store build, build numbers kept by EAS | Google Play and the App Store |

Pushing a tag `v*` runs `.github/workflows/release.yml`: `npm run verify`, an
EAS `preview` build for Android, and the APK attached to the GitHub release for
that tag (created as a draft if it does not exist). It needs one repository
secret, `EXPO_TOKEN`, from an unfoldingWord Expo account; no secret is stored
in this repository. Before the first build an account owner runs `eas init`
and adds the project id it prints to `app.config.ts` as `extra.eas.projectId`.
Store builds and submission run by hand for now
(`eas build --profile production`, then `eas submit --profile production`);
store credentials live in EAS, not here. Read the signing note in
[docs/release-checklist.md](docs/release-checklist.md) before the first
public build.

The `permissions` check guards what the native projects ask for. The Transport
radio will be the first change that admits a new permission, by name, in
`scripts/checks/permissions.ts`.

## Licence

Code is MIT (see [LICENSE](LICENSE)). Content the app delivers is published by
unfoldingWord and gateway-language organizations under CC BY-SA 4.0 and carries
its own attribution.
