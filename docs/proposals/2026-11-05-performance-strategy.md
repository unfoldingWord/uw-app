# Performance strategy: tune, measure on phones, move only hot paths native

Status: approved by the requirements owner on 2026-11-05 ("Go with your suggestions above"): the recommended option of every question below is the decision. (issue #100)

## Problem

The requirements owner asked: "I need better performance than what we are currently seeing. What's the best way
to get that? Should we rewrite native code or tune the current codebase? The amount of resources we are working
with is quite large. Is there a setup that would give us app logic in a single place but native code for both
platforms?"

What the record holds on 2026-11-05 (`docs/progress_tracker.md`, `docs/proposals/2026-10-20-*.md`):

- **App logic is already in one place.** One TypeScript kernel in `src/lib` serves Android, iOS and the Node sim
  (ADR 0001). React Native 0.86 renders native views on both platforms and Hermes runs the JavaScript.
- **Hot paths already go native behind ports.** `modules/uw-archive` (unzip, in Kotlin and Swift),
  `modules/uw-radio` and `modules/backup-exclusion` are local Expo modules; MD5 moved to expo-file-system's
  native `File.md5`. Each has a memory adapter, so the sim still runs.
- **Measured gains from that method.** Native unzip took the iOS simulator's English download flow from 94 s to
  46 and 47 s. MD5 of the literal text took 15.7 s in JavaScript on Hermes on a desktop core; it no longer runs
  in JavaScript, and the native replacement has not been timed.
- **No physical-phone timing has been recorded.** Every figure above is a simulator, an emulator or a desktop
  core. The Android emulator's install times (23 s and 72 s with the same build) are noise, not measurements.
- **Rendering.** Only `VerseList` and `StoryScreen` use a `FlatList`; Languages, Search, Library, the book picker
  and Training render every row in a `ScrollView` (#85). Glass rows each carry their own blur (#38, #85).
- **Package size.** The release APK `unfoldingWord-v0.0.2-native-unzip.1.apk` (EAS `preview` profile) is
  124.6 MB, of which 91.4 MB is native libraries for four CPU types (x86, x86_64, arm64-v8a, armeabi-v7a), and
  its Java code is not minified.

**Inference, labelled as one:** the slowness a leader feels is most likely rendering (blur, shadows, lists that
are not virtualised) and long work on the JavaScript thread, not React Native itself. Nothing measured yet
proves or refutes this; step 1 below is how it gets tested.

## Change

Tune the current codebase. Do not rewrite. Keep one TypeScript kernel, native rendering through React Native,
and targeted native modules behind ports where a measurement on a phone names the cost. In order:

1. **Measure on real phones first (#46).** A release build on one low-end Android phone (2 to 3 GB of memory)
   and one iPhone. Time cold start to Home, open Study, change chapter, open a story, scroll Training, run a
   search and install English. Use the React Native performance monitor and Android `adb shell dumpsys gfxinfo`
   for frame times, and the journal's own event times for installs. Record each run in
   `docs/progress_tracker.md`. Every later step is ranked by these numbers, and each follow-up issue carries
   a target number.
2. **Rendering.**
   - Virtualise every long list with React Native's `FlatList` (#85). A new list package (FlashList, for
     example) is considered only if `FlatList` misses the target on the phone, and is then recorded as a new
     dependency.
   - One blur per screen surface, not one per row (#38, #85). Rows inside a glass surface already render no
     blur of their own (decision 64); the lists that still blur per row change to plain rows on the surface.
   - Measure the animated aurora behind blur on Android, and keep the reduced-blur default below API 31 until
     the phone numbers say otherwise.
3. **Release build size.**
   - Turn on R8 minification and resource shrinking for Android release builds, with keep rules for the local
     modules and any library that needs them. The exact Gradle property names for Expo SDK 57 are confirmed
     against the generated `android/` project before the change.
   - Build APKs for phone CPUs only, arm64-v8a and armeabi-v7a. The Play Store bundle (`production`,
     `app-bundle`) already splits by CPU on delivery, so this mainly shrinks the sideloaded APK (`preview` and
     `apk` profiles).
   - **The device CI needs x86_64.** It builds with `./gradlew :app:assembleRelease
     -PreactNativeArchitectures=x86_64` for an x86_64 API 30 emulator (`.github/workflows/device.yml`,
     decision 54). The CPU list is therefore set per EAS profile, through an environment variable in
     `eas.json` that `app.config.ts` reads (as `UW_ANDROID_PACKAGE_INSTALLER` is read today), never as a
     single value in `app.config.ts` that the CI would inherit. Because the CI builds `assembleRelease`, it
     runs the minified build too, which is where an R8 keep rule that is missing would show.
4. **Work off the JavaScript thread, by measurement.** Candidates: corpus ingest and full-text indexing
   (`src/lib/corpus/ingest.ts`, `fulltext.ts`), and first-time USFM parsing (`usfm.ts`, `passage.ts`). Options in
   increasing cost:
   - (a) yield and batch more, as the Files adapter already yields after 24 ms of work;
   - (b) a spike running the heavy kernel functions in a second JavaScript runtime with
     `react-native-worklets`, checking first whether expo-sqlite can be reached from that runtime; the spike
     reports and adopts nothing on its own;
   - (c) a local native module behind a port, as `uw-archive` did, with its memory adapter in the same PR.
5. **Instant feedback on every action (#99).** A control goes busy before its first `await` (AGENTS.md section
   10) and shows the DotRing while it works, so any delay that remains is seen, not felt as a freeze.

## Alternatives

- **Rewrite natively in Kotlin and Swift.** Two copies of every rule, double the upkeep, and the loss of the
  sim, replay and the checks that catch bugs before a phone (ADR 0001). No measurement justifies it.
- **Kotlin Multiplatform or Flutter.** Logic in one place and native or own-engine rendering, but reaching that
  means rewriting the kernel, every screen and every adapter, to arrive about where the app is today.
- **Keep all four CPU types in every APK.** Keeps x86 Chromebooks and x86 emulators working from the
  sideloaded APK, at about 91 MB of native libraries. Not recommended for the phone APK; an x86_64 build stays
  available from the device CI.
- **Move work off the thread before measuring.** Risks spending native effort on a path that is not the
  cost. Refused: step 1 comes first.

## Rules affected

- Rule 4: `app.config.ts` and `eas.json` change for R8, resource shrinking and the CPU list; this proposal is
  their review. Shared list rows and glass changes in `src/shared/` follow the proposals of #85 and #38.
- Section 3: any new native module is a local Expo module behind a port, with a memory adapter (rule 1, "new
  port"); a module without an Expo config plugin needs its own proposal.
- Section 6: `react-native-worklets`, if the spike recommends it, and any list package are new dependencies,
  each recorded with what it replaces. A Gradle settings plugin such as `expo-build-properties` is not
  installed today; the alternative is a local config plugin under `plugins/`.
- DX-3 and the sim: unchanged. A work-off-thread option that the sim cannot run is refused.

## Decision taken

1. Strategy: **tune the current codebase, measuring on phones first, and move only measured hot paths
   native behind ports** (recommended), or a native rewrite (Kotlin and Swift, or Kotlin Multiplatform or
   Flutter).
2. Which two phones are the reference for #46, and who runs them? Recommended: one low-end Android phone of
   the kind leaders use, and one iPhone that is several years old.
3. Sideloaded APK CPU types: **arm64-v8a and armeabi-v7a only** (recommended), or also x86_64 for
   Chromebooks.
4. Turn on R8 minification and resource shrinking for Android release builds: **yes, proven first by the device
   CI's release build** (recommended), or no.
5. Should this be recorded as an ADR once accepted? **Yes** (recommended).
