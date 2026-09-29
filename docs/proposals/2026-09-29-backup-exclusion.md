# Keep the packs and the database out of iCloud backup

Status: proposed, awaiting human approval. Nothing below is built. Android is already covered by
`android.allowBackup: false` in `app.config.ts`, checked by `scripts/checks/permissions.check.ts`.

Evidence labels: **checked** means read in the package source in `node_modules` on 2026-09-29; **inference**
means reasoned, not observed on a phone.

## Problem

PRD section 12: names, groups, notes and progress never leave the device except when the leader transfers or
shares. An iCloud or computer backup of the app's container carries them off the phone. Apple's storage
guidance also asks that content the app can download again (language packs, 40 to 60 MB each) is not backed
up; App Review rejects apps that fill iCloud with it (inference from the guideline, not a rejection we have seen).

Where the data lives on iOS today (checked):

- Packs and every other Files port path: `Paths.document/device/` (`src/platform/files.ts`,
  `createDeviceRoot`). `Paths.document` is the app's `Documents` directory, which iOS backs up.
- The database `uw.db` and the preferences database `uw-preferences.db`: expo-sqlite's
  `defaultDatabaseDirectory`, which is `documentDirectory/SQLite` (`expo-sqlite/ios/SQLiteModule.swift`),
  also backed up.

Neither expo-file-system 57 nor expo-sqlite 57 exposes a way to set `NSURLIsExcludedFromBackupKey`: a grep of
both packages for `isExcludedFromBackup` and `ExcludedFromBackup` finds nothing. The only other directories
expo-file-system offers are `Paths.cache`, which iOS may purge when space is low (packs would vanish; not
acceptable), and `Paths.bundle`, which is read-only. `Library/Application Support` is also backed up, so
moving there alone changes nothing.

## Change

Add one local Expo module, `modules/backup-exclusion`, built with the Expo Modules API (so it has an Expo
config plugin by construction and autolinks; AGENTS.md section 3 still makes it an architecture change):

- iOS: `excludeFromBackup(uri: string): void` sets `URLResourceValues.isExcludedFromBackup = true` on the
  directory at `uri`. The flag applies to the directory and everything under it, and survives writes inside it.
- Android: the same function is a no-op; `allowBackup: false` already covers the whole app.
- `src/platform/files.ts` calls it on the device root after `directory.create`, and `src/platform/db.ts` and
  `src/platform/kv.ts` call it on the SQLite directory before opening. No port changes: backup is a property
  of where the platform adapter keeps things, and the memory adapters have nothing to exclude.
- A test on a phone, recorded in `docs/progress_tracker.md`: after first start, the Settings, then iCloud,
  then Manage Storage entry for the app shows almost nothing, and `NSURLIsExcludedFromBackupKey` reads true on
  both directories (read back by the module in a debug build).

## Alternatives

- **Accept the backup.** Simplest, but it breaks PRD section 12 for names, groups and notes, and risks review.
- **Packs in `Paths.cache`.** Excluded from backup, but iOS deletes caches under storage pressure, which is
  exactly when a leader in a low-connectivity place cannot download again. Refused.
- **A third-party package.** Not searched in this task; AGENTS.md section 6 asks for that search before the
  local module is written. `react-native-fs` is already refused as a device module in
  `scripts/eslint/boundaries.ts`, and a whole native file system for one flag would be the wrong trade in any
  case. A dozen lines of Swift in a local module is likely smaller than any candidate (inference).
- **Ask Expo** to add `isExcludedFromBackup` to expo-file-system. Worth filing; not something the release can wait on.

## Rules affected

- AGENTS.md section 3, "Native modules outside Expo": a local module is native code, so this proposal is the
  gate. It has a config plugin by construction, so it does not need the Expo-config-plugin exception.
- Rule 4: `src/platform/files.ts`, `db.ts` and `kv.ts` are shared roots; the change there is one call each.
- Release criterion 5 (store listing) and PRD section 12. Until this lands, `docs/release-checklist.md` lists it
  as blocking the App Store submission.
