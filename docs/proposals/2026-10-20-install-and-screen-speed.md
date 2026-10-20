# Faster language installs and screens

Status: approved by the requirements owner on 2026-10-20 ("the English download took too long so that download
process needs optimized", and the slowness "makes the app feel buggy"; decisions delegated to the agent).

## Problem

Measured with `npm run perf` (an English-size language pack served to a sim device: 11 resources, 237 MB on the
phone, matching the live English pack) and `npm run perf:engines` (the hot functions timed on Node and on Hermes
0.13 with the same inputs):

- MD5 of every unpacked byte runs in JavaScript (`@noble/hashes`). On Hermes it is 10.9 times slower than on
  Node: 15.7 s for the literal text alone on a desktop core, so minutes for the whole pack on a phone.
- Downloads and unpacking run strictly one after the other, so the network waits for the CPU and the CPU for the
  network.
- Unpacking never gives the JavaScript thread back, so the screen freezes and progress stops moving while an
  archive unpacks.
- Corpus ingest parses every row of every notes, links and questions table only to count them.
- Word Links removes its copy of each Translation Words article and lists the folder after every removal.
- Home reports a download complete before corpus ingest has run. On the CI emulator the English download flow
  reaches "ready offline" and Study then shows nothing to read; Study never reloads after a pack lands.

## Change

- **Files port:** `md5(path)`. The platform adapter returns expo-file-system's native `File.md5`; the memory
  adapter hashes the stored bytes. Unpack records sizes only, and the install compares every listed ingredient's
  on-disk MD5 with `metadata.json` before the pack is renamed into place. The failure code is unchanged
  (`pack.checksum-mismatch`). The Image Pack build hashes each picture the same way.
- **Install:** up to two archives download ahead while the current one unpacks. Placement, events and failure
  handling stay in plan order. `PackInstallProgressed` carries the bytes of placed resources only, so journals stay
  deterministic. An aborted install waits for the downloads in flight before it cleans up.
- **Readiness:** an install stays in `packs.installing()` until `PackInstalled` and its corpus ingest settle, so
  every screen that says ready can read. Study and Library reload when packs change.
- **Platform files:** the adapter yields to the event loop when it has been busy for more than 24 ms, so the
  screen and the progress poll keep running during an unpack.
- **Corpus:** `helpsRowCount` counts the rows a full read would accept from the reference and ID cells alone,
  and falls back to the full read for a table with quoted cells. A test holds the two equal.
- **Word Links:** the emptied folders are pruned once after the duplicate articles are removed.
- **Harness:** `npm run perf` and `npm run perf:engines`, with English-size data scaled from the fixtures
  (`scripts/perf/scale.ts`), since the sandbox cannot reach DCS.

## Alternatives

- **Native download (`File.downloadFileAsync`).** It follows redirects without checking each hop against the host
  allowlist the Http port enforces (AGENTS.md section 10), and the JavaScript download moves only the compressed
  33 MB. Not taken.
- **Native unzip.** It would remove the largest remaining cost (fflate, about 1.6 times slower on Hermes than on
  Node). It needs native code in a local module on both platforms. It is a follow-up once the device numbers from
  this change are in.
- **Verifying sizes only.** It would drop the MD5 check altogether. Rejected: a corrupt or tampered archive must
  still fail.

## Rules affected

- Rule 4: `src/lib/ports.ts` (one Files method) and `src/platform/files.ts` are shared roots; both adapters change
  in this PR, as rule 1 requires for a port.
- Rule 2: the yield uses `setTimeout` in `src/platform`, never in `src/lib`.
