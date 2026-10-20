# Native unzip behind the Files port

Status: approved by the requirements owner on 2026-10-20 ("start the native unzip PR as a new thing", after
`docs/proposals/2026-10-20-install-and-screen-speed.md` named it as the follow-up).

## Problem

After the MD5 moved to native code, inflating every archive in JavaScript (fflate) is the largest cost left in a
language install. On Hermes it runs about 1.6 times slower than on Node (`npm run perf:engines`), and every chunk
crosses the bridge twice: read from the archive into JavaScript, then written back out as a file. The English
download waits 67 s on the CI Android emulator and 94 s on the iOS simulator after #77. How much of that is
unpacking was not measured on the device; it is inferred from the sim's port timings and the Hermes ratio.

## Change

- **Files port:** `extract(archive, into, limits)` writes every file of a zip archive under `into` and returns
  each file's path and inflated size, or a refusal: `archive-unreadable`, `archive-path` (an absolute path, a
  backslash or a `..` segment, or a target the canonical path puts outside `into`) or `archive-too-large` (more
  entries, or more inflated bytes, than the limits). The scope guard checks `into` like any write.
- **Platform adapter:** a local Expo module, `modules/uw-archive/`, with no dependency beyond the platform. Android
  uses `java.util.zip.ZipFile`. iOS reads the zip's central directory itself and inflates raw DEFLATE with Apple's
  Compression framework (`COMPRESSION_ZLIB`); zip64, encrypted entries and methods other than stored and DEFLATE
  are refused as unreadable. Both stream in 256 KB chunks and count the bytes actually inflated, not the sizes
  the archive claims.
- **Memory adapter:** the same contract with fflate, so the sim and every scenario keep running in Node. Its
  writes are reported to observers as `extract`.
- **Unpack:** `unpackArchive` with `into` calls `files.extract`, removes the files outside the burrito
  (`mayHoldBurrito`), and reads `metadata.json` and the licence back from disk, within the existing 16 MB limit.
  Without `into` (the peek at an imported file) it stays in JavaScript and inflates only `metadata.json` and the
  licence; the other entries are skipped, not inflated.
- **Contract:** a Files case for extract: sizes and bytes, a path above the directory, an absolute path, too many
  entries, too many bytes, bytes that are not an archive and a missing archive. Observed red with the memory
  adapter's path check and byte limit each disabled.

## Alternatives

- **`react-native-zip-archive`.** MIT, and it unzips natively, but it brings SSZipArchive on iOS, and its
  documented unzip API takes no limit on entries or inflated bytes, so a zip bomb would fill the disk before the
  kernel could refuse it (read from its README, not tried). The local module is about 400 lines on both platforms.
- **Keep fflate and move it off the JavaScript thread.** There is no worker thread for plain JavaScript in this
  app, and the bridge copies would remain.
- **Native download as well.** Still refused: redirects would skip the host allowlist (AGENTS.md section 10).

## Rules affected

- Rule 4 and AGENTS.md section 3: `src/lib/ports.ts` gains one Files method, and `src/platform/files.ts` and
  `src/platform/ports.ts` change. The new local module has an Expo module config, as section 3 requires. Both
  Files adapters change in this PR (rule 1).
- AGENTS.md section 10: the module makes no network call and reads only the archive it is given.
