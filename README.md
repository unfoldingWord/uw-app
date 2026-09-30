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

v1.0.0 is built end to end in the sim and bundles for both platforms; it has
not yet run on a phone. Release builds start on an Android emulator and an iOS
simulator in CI (`.github/workflows/device.yml`), and every screen is
photographed in Chromium by the render harness (`npm run shots`; the contact
sheets are in [docs/shots/](docs/shots/)). What each release criterion still
needs is in [docs/release-checklist.md](docs/release-checklist.md), and what
actually ran is in [docs/progress_tracker.md](docs/progress_tracker.md).

**Built and proven in the sim** (`npm run trace`: 51 Must requirements, 50
with a scenario in `sim/scenarios/` and SE-2 proven by a test, since the sim
renders nothing): onboarding, Home, Study (passages with attached helps and
introductions, literal and simplified text, articles, search, the original
languages), Formation (tracks, groups, sessions with the five movements and
the fallback), Languages and downloads (language, image and audio packs,
partial packs, optional downloads, updates, storage), share out, import from a
file, the partner invitation and impact stories, Settings, diagnostics and
replay. Transfer is proven on the sim's memory bus. The live catalog is read in
CI: the contract step validates the live releases and installs the default
English and Indonesian packs from DCS.

**Built, not yet run on a phone:** the Transport radio (TCP on a shared local
network, mDNS discovery, a typed or scanned address; ADR 0013), the Android app
package hand-off, the iCloud backup exclusion
([proposal](docs/proposals/2026-09-29-backup-exclusion.md)) and Android's
exclusion from cloud backup and device-to-device transfer. The image and audio
packs are burritos the app writes around catalog assets (ADR 0006); audio is
download-only in v1.0.0.

**Needs a phone:** the platform adapters, the radio (a two-phone spike, 60 MB
both ways), glass rendering in light, dark and reduced blur, RTL, dynamic type,
screen readers, audio, and a diagnostics file from a phone replaying in the sim.

**Blocked:**

- The five-movement formation content: DCS does not yet build its burrito
  archive (HTTP 500 for `en_obs-tf` v4), so Formation runs on a provisional
  fixture flavor and installs only on request.
- The locales: each of the fifteen drafted translations ships only once a
  native speaker signs it off (`docs/strings-review.md`); until then the app
  offers English.
- The impact story copy and feed: communications review.
- The store listings: iOS keeps the existing App Store record's bundle
  identifier `com.unfoldingword.iosapp`; the Android package and signing key
  wait on the Play account holder (the DRI), and the short link domain for
  share-out on Product.
- Sending the anonymous counts: v1.0.0 counts on the phone and sends nothing;
  sending is v1.1 (ADR 0012).

## The cockpit

Start from the sim. A phone is for three things: platform adapters, glass
rendering and radios.

```
npm run sim -- <scenario>         run one scenario; print the snapshot and journal
npm run sim -- all                every scenario
npm run replay -- <journal.json>  rebuild a device from a shared diagnostics file
npm run trace                     fail on any Must requirement ID with no scenario and no test
npm run contract                  validate fixture burritos, and a live release when online
npm run check                     lint and format
npm run verify                    the whole chain, the same one CI runs
```

`npm run checks` runs the rule checks on their own (locale sign-off, network,
owns, permissions, provenance, routes, strings, tokens), and `npm run icons` redraws
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

The `permissions` check guards what the native projects ask for: every
permission is admitted by name with its reason, or blocked.

## Licence

Code is MIT (see [LICENSE](LICENSE)). Content the app delivers is published by
unfoldingWord and gateway-language organizations under CC BY-SA 4.0 and carries
its own attribution.
