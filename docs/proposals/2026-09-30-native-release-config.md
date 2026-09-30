# Native release configuration: store identity, backups, permissions and builds

Status: approved through the decisions in issues #5, #26, #45 and #48 (2026-09-30), and built the same day.
`app.config.*` and `eas.json` are shared roots (AGENTS.md rule 4), so this records what changed in them and why.
No rule is broken, so there is no entry in `docs/exceptions.md`.

## Problem

- **#45.** This app replaces the existing App Store record "unfoldingWord" (id 925570688, bundle
  `com.unfoldingword.iosapp`). Apple does not change the bundle identifier of an existing record, and
  `app.config.ts` used `org.unfoldingword.app`.
- **#5.** `android.allowBackup: false` turns off cloud backup only. On Android 12 and later a device-to-device
  migration still copies the app's data, so notes and group names would move to a new phone outside Transfer
  (PRD 12; from the Android documentation, not observed on a phone).
- **#26.** The `permissions` check read only the app manifest from `expo config --type introspect`. A permission
  a library manifest merges in (expo-network's `ACCESS_WIFI_STATE`) was never observed, and a permission on
  neither the admitted nor the refused list passed silently.
- **#48.** Every preview APK shared one `versionCode`, so sideloaded builds had no order; file managers and
  chat apps send a burrito as `application/x-zip-compressed`, which the intent filter did not name.

## Change

- `app.config.ts`: iOS `bundleIdentifier` is `com.unfoldingword.iosapp`; the Android package stays
  `org.unfoldingword.app` until the DRI names the existing Play listing's package and signing key
  (`docs/release-checklist.md`, row 5). `blockedPermissions` lists every Android dangerous permission and the
  other refused ones, including `ACCESS_WIFI_STATE`. The archive intent filter adds
  `application/x-zip-compressed`. The exported config is wrapped by `withDataExtractionRules`.
- `plugins/data-extraction-rules`: a config plugin that sets `android:dataExtractionRules` and copies
  `data_extraction_rules.xml`, which excludes every domain from `cloud-backup` and `device-transfer`.
- `eas.json`: `autoIncrement: true` on the preview profile as well as production; with
  `appVersionSource: remote` both draw from one remote counter, so every build has its own `versionCode`.
- `scripts/checks`: the admitted permissions are one record, a name and a reason per line
  (`android-permissions.ts`); every dangerous permission not admitted must be blocked and none admitted may
  be; every `uses-permission` in a library `AndroidManifest.xml` under `node_modules` or `modules/` must be
  admitted or blocked (`library-manifests.ts`); the data extraction rules are asserted in the manifest and in
  the file the plugin copies (`backup-rules.ts`); the iOS bundle identifier must be the App Store record's.
- `src/platform/picker.ts` offers `application/x-zip-compressed` to the document picker too.

Adding a permission a later feature needs (the Transport radio, for one) is one line with its reason in
`androidAdmitted`, and the name leaves `blockedPermissions`.

## Alternatives

- **A merged-manifest assertion from Gradle** (`processReleaseManifest`, or `aapt dump permissions` on the
  APK). It would also see Maven dependencies outside `node_modules`, but needs the Android SDK, which neither
  this environment nor `npm run verify` has. Left to the device build workflow.
- **Admitting `ACCESS_WIFI_STATE`.** expo-network 57 reads `WifiManager` only in `getIpAddressAsync`, which the
  Http adapter never calls (read in `NetworkModule.kt`), so it is blocked instead.
- **Versioning from the git tag** instead of the remote counter. More moving parts for the same ordering.

## Rules affected

- Rule 4: `app.config.ts` and `eas.json` are shared roots, changed here under the issue decisions.
- AGENTS.md section 3: no native module is added by this change (the backup exclusion module has its own
  approved proposal, `docs/proposals/2026-09-29-backup-exclusion.md`).
