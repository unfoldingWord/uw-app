# Release checklist

The first public release ships when every criterion in PRD section 13 is true. This page maps each one to
its evidence: what the sim already proves (scenario ids under `sim/scenarios/`), what only a phone can show,
and what is blocked and on whom. Status as of 2026-09-29 (T13, rows 6 and 8 updated in G1). A phone run counts only once it is recorded in
`docs/progress_tracker.md`.

Legend: **proven** means a scenario or check ran green in `npm run verify`; **device** means it needs a
recorded run on a phone; **blocked** names the missing input and its owner.

| # | Criterion | Proven in the sim or by a check | Needs a device run | Blocked, and on whom |
|---|---|---|---|---|
| 1 | All 16 locale languages appear with what is in production; at least eight offer the full core set offline | LA-1 (list with autonym, English name, count, Offline badge), LA-2 (one pack holds every text resource), LA-5, LA-6, LA-7, ON-2; `npm run contract` validates every fixture burrito | Download the eight full-core languages of PRD 8.6 on a phone, go offline, open each resource type | The live catalog was never reached from this environment (git.door43.org answers 403), so no real release has been installed; the contract's live check must run once online. Burmese and Dutch have nothing tagged: content teams (PRD 8.6) |
| 2 | Formation end to end with five movements in English and Indonesian, fallback elsewhere | FO-1 to FO-6 (FO-2 and FO-5 on provisional fixture flavors, `docs/proposals/2026-09-29-provisional-flavors.md`) | Run a session in English and Indonesian from a real pack | DCS does not yet generate a burrito archive for the five-movement formation repository (reported as an HTTP 500 on the archive request; not observed from this environment): DCS team (PRD 15). The provisional flavor names must then be replaced by the pinned ones |
| 3 | Transfer with resource selection, no internet, iOS to Android and back; Android sends the app | SH-1 and SH-2 on the memory Transport bus, SH-3 (import from a file: the kernel path, the Languages service over the memory Picker with a cancelled pick, a failed pick and an invalid archive, and a file another app opened; the `permissions` check proves the `.zip` registration on both platforms), SH-5 | Every transfer part: no radio exists on a phone yet (`src/platform/transport.ts` reports unavailable). Import on a phone: pick a `.zip` in Languages, open one from Files (iOS) and from a file manager and a chat app (Android), each online and offline | The Transport radio proposal, `docs/proposals/2026-09-29-transport-radio.md`: a human decision, then the spike on two low-end phones. The radio will add local network (iOS) and nearby devices permissions, which must then be admitted by name, one line with its reason each, in `androidAdmitted` in `scripts/checks/android-permissions.ts` and taken out of `blockedPermissions` in `app.config.ts` |
| 4 | Every screen works with no connection after the initial download | Offline cases in LA-1, HO-5, ST-4, FO-5, PA-1, PA-6 and SH-3, and in `sim/adapters/adapters.test.ts`, `sim/catalog.test.ts` and `sim/packs.test.ts` | Airplane mode on each screen after a download (U2's render harness covers layout, not the radios) | None beyond criterion 1's real download |
| 5 | Listed on both stores as "unfoldingWord", signed Android package on the GitHub release | `app.config.ts` names the app `unfoldingWord`; the `permissions` check proves the app manifest (`expo config --type introspect`) and Info.plist carry only admitted permissions, every dangerous permission not admitted is blocked, every permission a library `AndroidManifest.xml` under `node_modules` or `modules/` would merge in is admitted or blocked (Maven dependencies outside `node_modules` are not observed; only a Gradle merge or the built APK shows them), `allowBackup` false, no usage descriptions, no background modes, no entitlements | An EAS preview build installed from the GitHub release on a phone; a TestFlight build | Store name availability on both stores: Product (PRD 15). iOS: the app replaces the existing App Store record "unfoldingWord" (id 925570688, unfoldingWord seller), so `app.config.ts` uses its bundle identifier `com.unfoldingword.iosapp` (Apple never changes it on an existing record), and the `permissions` check refuses any other (issue #45). Android: the package stays `org.unfoldingword.app` until the DRI for the existing Play listing supplies its package name, the upload keystore or confirmation that Play App Signing holds the key, and who may run the upload; only then can `android.package` change to the old package (issue #45). `EXPO_TOKEN` secret and `eas init` (writes the EAS project id, which `app.config.ts` must then carry as `extra.eas.projectId`): an unfoldingWord Expo account owner. App Store submission: iCloud backup exclusion, `docs/proposals/2026-09-29-backup-exclusion.md` (human decision). Signing: see the note below |
| 6 | UI in English plus every locale with complete strings; RTL verified for Arabic, Urdu and Farsi | `strings` check: every key in all 16 locales, placeholders and plural forms agree; `app.config.ts` registers the 16 locales (iOS `CFBundleLocalizations`, Android `localeConfig`) with RTL support; the layout direction follows the app locale, not the phone's language (`needsDirectionChange` in `src/lib/strings/strings.test.ts`, SE-1; the root layout sets `I18nManager` and reloads) | RTL layout and mirrored icons in ar, ur and fa on both platforms; switching the app language to and from Arabic restarts once into the right direction; an English app on an Arabic phone lays out left to right | Native review of every AI-drafted locale, `docs/strings-review.md`: content or localization reviewers |
| 7 | Screen-reader labels on every control, dynamic type, contrast AA in both themes | SE-2 by the type-level test that refuses an unlabelled interactive primitive (`src/shared/glass/names.test.ts`, exception recorded) | VoiceOver and TalkBack pass per screen; largest text size; contrast measured on glass in light and dark | None |
| 8 | Analytics exactly as PRD section 9, verified by inspecting outbound traffic | Telemetry folds over the journal (DX-1, DX-3); `telemetry.leaving()` is the PRD 9 fold list and nothing else, and the privacy screen lists exactly those folds (SE-1, `src/lib/telemetry/folds.test.ts`); the privacy copy says the app counts on the phone and sends nothing until a later release turns sending on; `network` check: no runtime dependency opens connections or reports to a third party, and the Http port admits only `git.door43.org`, `cdn.door43.org` and `unfoldingword.org`; OTA updates are off (`updates.enabled: false`) | A proxy capture of a phone session showing only those hosts | Sending the aggregate counts is not built: no endpoint is chosen, so nothing leaves the phone today. When it lands, the iOS privacy manifest must declare the counts (Product Interaction, not linked, not tracking) and the privacy screen must match: Product |
| 9 | `npm run verify` green, every Must has a scenario (DX-4), a real phone's journal replays to the same snapshot (DX-3) | verify green (see the T13 entry in `docs/progress_tracker.md`); `trace`: 51 Must requirements, 50 with a scenario, 1 (SE-2) proven by a test on the documented list; DX-3 replays a sim journal | Export a journal from a phone through Share, then `npm run replay -- <journal.json>` | None beyond having a phone build |

## Also needed before submission

- **Transfers per platform pair (note for Product).** PRD 14 lists "Transfers completed, per platform pair"
  as a proposed success measure, but PRD 9's fold list, which is the only thing that may leave the device,
  names only "transfers completed". Decision in G1, without editing the PRD: the telemetry module keeps the
  `transfersByPlatformPair` fold on the phone (SH-1 asserts it, the diagnostics journal shows it), but it is
  not in `leavingFolds` (`src/lib/telemetry/folds.ts`), so it is not in what would be sent and not on the
  privacy screen. If Product wants the split measured, add it to PRD 9 and the privacy screen together (PRD
  9 requires both to change), then add it to `leavingFolds` and restore its `privacy.count.*` string.

- **Impact story comms review.** The shipped story and the feed follow the brand security guideline; the
  communications team signs off the copy and sets up the feed (PRD 15, `docs/impact-stories.md`). Since G1
  the app fetches the feed from Home and About when online, once per launch and once per new-day resume (PA-6), so the feed URL
  `https://unfoldingword.org/app/impact-stories.json` must exist before release or every open journals a
  failed refresh (harmless, shown nowhere).
- **Short link domain** for the "get the app" link in share-out (SH-4): Product (PRD 15 and 17).
- **Audio as release assets.** DCS does not yet carry audio in burritos (PRD 15); ST-4 and LA-4 run on a
  provisional fixture flavor.
- **Opening a burrito file from another app** (SH-3 on a phone). Wired in I1 but not run on a phone: the
  Languages modal has "Import from a file" (the Picker port over `expo-document-picker`), `app.config.ts`
  registers `CFBundleDocumentTypes` for `public.zip-archive` and an Android `VIEW` intent filter for
  `application/zip` and `application/octet-stream` over `content`, and `app/+native-intent.ts` sends a handed
  `file://` or `content://` URL to the Languages modal, which asks before installing. Android `SEND` (sharing a
  file to the app) is not registered: React Native's `Linking` does not read `EXTRA_STREAM`, and a native module
  outside Expo needs its own proposal. A file opened before onboarding is finished is dropped, because the
  Languages modal is behind the onboarding guard. Proposal: `docs/proposals/2026-09-29-file-import.md`.

## Signing note

The preview profile's APK is signed with the EAS-managed key for `org.unfoldingword.app`, the placeholder Android package until the DRI names the existing Play listing's package (row 5). The Play Store build
is re-signed by Google Play app signing with a different key unless the upload key is registered as the app
signing key. Android refuses to update an app signed with one key by a package signed with another, so a
leader who sideloaded the GitHub APK (or received it phone to phone, SH-2) could not update it from Play, and
the reverse. Product and whoever holds the Play account decide which key signs both before the first release.
