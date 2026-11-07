# English inside the app, and phone-only CPU types

Status: approved by the requirements owner on 2026-11-06. Jesse Griffin: "The app really needs to ship with the
English content and the OBS stories built into it." Asked how much, he chose everything: the whole English
default Language Pack, English Open Bible Stories with its helps, and the story pictures, so the app works fully
offline on first launch; and, in the same work, to cut the APK to phone CPU types (decision 101). Recorded as PRD
decisions 105 and 106 and requirement ON-5; the hard-to-reverse part is ADR 0015.

## Problem

A fresh install holds no content. Continue in English downloads about 71 MB of archives from Door43 before a leader
can read a verse, and a leader with no connection on first launch reads nothing at all (ON-2 lands on Home with a
download that cannot start). Leaders often receive the app phone to phone or from a sideloaded APK precisely where
the connection is poor. Separately, sideloaded APKs carry four CPU types, two of which (x86, x86_64) no phone the
leaders own needs.

## Change

**A fourth pack source, `bundled`.** Content still enters only as Scripture Burrito archives with provenance,
through the one install path (ADR 0005):

- `content/bundled.lock.json` pins, for one language (English today), exactly the releases the default plan
  installs: every archive's publisher, resource, tag, commit, title, Door43 URL, size and sha256. The Image Pack is
  pinned as the archive the app's own builder writes from the `en_obs` release it cites (ADR 0006), so its sha256
  is reproducible. `npm run bundled:lock` resolves it from the live catalog through the sim, the same way a
  download resolves the default plan (`defaultReleases`, `picturesFollow`), installs it in the sim to prove it
  whole, and writes `src/platform/bundled-archives.ts`, the module that imports each archive as an asset.
  Both files are committed, so every build of a commit carries the same bytes.
- The archives are never committed. `npm run bundled:fetch` downloads exactly the locked archives from allowlisted
  Door43 hosts, rebuilds the Image Pack, checks each against its size and sha256 and the content contract
  validator, installs them offline in a sim device, and places them in `content/bundled/` (ignored by git). It
  fails, and so fails the build, when the lock is missing, invalid, out of step with the platform module, or any
  archive does not verify. Every native build path runs it: the EAS `eas-build-post-install` npm hook (so preview,
  apk and production builds on EAS), `release.yml` before it spends an EAS build, and both `device.yml` jobs before
  their local Gradle and Xcode builds (cached by the lock's hash). A weekly `bundled.yml` job resolves the lock
  again and says in its summary when the catalog has moved on, with the new lock as an artifact for a pull request.
- Metro carries `.zip` as an asset (`metro.config.mjs`), so the archives sit inside the app binary. A new
  **Bundled** port reads them: `archives()` lists what the app carries and `open(file)` hands one to the Files
  port, which adopts it into the install's staging directory; the platform adapter uses `expo-asset`, already a
  dependency, and the memory adapter carries what a scenario gives it.
- `packs.placeBundled()` installs each carried pack that is not on the phone and was never on it, offline and with
  no prompt, emitting the normal `PackInstallStarted` (source `bundled`), progress and `PackInstalled` events. The
  root layout calls it once the kernel starts; onboarding waits on it for a carried language instead of starting a
  download, so Continue in English asks for nothing. A new `bundled_packs` table, owned by Packs, remembers every
  carried pack that has been on the phone, so a leader who removes English never gets it back unasked. A carried
  pack that fails is a `PackFailed` with its code (`pack.checksum-mismatch`, `files.not-found`, and so on), shown on
  Home like any failed pack, and is tried again on the next start; the leader can still download it from the
  catalog. A newer catalog release replaces a carried one through `update` (LA-7). Placing is not a download, so
  `languagePackDownloads` does not count it. Storage and the Licence page say "Came with the app".
- `npm run bundle` fails when the lock is missing or invalid, and when an export carries a different number of
  archives than the lock pins; where the archives are not fetched (the verify job), it bundles stand-ins under the
  locked names for the check and removes them after.

**CPU types.** The EAS `preview`, `apk` and `production` profiles set
`ORG_GRADLE_PROJECT_reactNativeArchitectures=armeabi-v7a,arm64-v8a`, a Gradle project property read from the
environment, so those builds carry the two phone CPU types only. The device CI's emulator build keeps
`-PreactNativeArchitectures=x86_64` on its own Gradle command line, and `development` keeps every type. Nothing is
set globally and no dependency is added (`expo-build-properties` would set it for every build).

**Cost, measured in the sim and estimated for the binary.** The pinned archives are 70.9 MB (English 33.1 MB, the
Image Pack 37.8 MB). Unpacked on the phone they are 276 MB (English 227 MB, pictures 49 MB), measured as the bytes
the sim's Files adapter holds after placement. The archives stay inside the app binary, so a phone holds about
347 MB for the app's content after first launch, and briefly about 38 MB more while one archive is adopted. The
Android APK grows by about 71 MB (zip files are stored, not compressed again); the CPU cut saves the x86 and x86_64
native libraries. These binary sizes are estimates until a build reports them.

## Alternatives

- **Download on first launch, as today.** Rejected by the owner: the first launch is where the connection is
  worst.
- **Commit the archives to git.** 71 MB per release in history forever, and an archive could drift from the
  catalog with nothing to say so. The lock pins the same bytes reproducibly.
- **Resolve the lock in CI at build time.** Two builds of one commit could carry different releases. The lock is
  committed; CI only reports drift.
- **The `expo-asset` config plugin, or Android raw assets read through the file system.** Embeds files without
  Metro, but reading them back differs per platform and is not documented for arbitrary files. Metro assets with
  `Asset.downloadAsync` are the documented path (the same one `expo-sqlite` documents for a prebuilt database).
- **A kernel option instead of a port.** The list of archives and the way to open one are what the device provides;
  a port keeps the sim honest and the platform adapter replaceable.
- **Unpack at build time and ship the directories.** Saves the duplicate on the phone, but skips the checksum
  verification and atomic install the install path gives, and multiplies the asset count by thousands.
- **`expo-build-properties` for the CPU types.** Sets one value for every build, including the device CI's
  emulator build, and adds a dependency.

## Rules affected

- AGENTS.md section 10: content enters as a burrito from the catalog, **the app's own pinned archives**, a peer or a
  file. Section 3 gains the Bundled port row.
- Rule 4 shared roots touched: `src/lib/ports.ts` (the Bundled port), `src/lib/domain/pack.ts` (`bundled` source),
  `src/lib/domain/failures.ts` (the `bundled` step), `src/platform/` (the adapter and the generated module),
  `app/_layout.tsx` (one call after start), `eas.json` (CPU types per profile). `src/lib/compose.ts` passes the port
  through.
- Rule 3: the `bundled_packs` table has one writer, Packs (`owns`), created by migration `0008-bundled-packs`.
- ADR 0005 grows from three sources to four; ADR 0006 is unchanged (the carried Image Pack is the same app-written
  burrito, written at build time by the same builder). ADR 0015 records the decision.
