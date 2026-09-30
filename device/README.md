# Device flows

Maestro flows that drive the release build of the app on an Android emulator and an iOS simulator. The sim
answers questions about the kernel; these flows answer the three questions only a device can: does the
native build start, do the glass screens render, and do the controls respond to a real touch.

The workflow `.github/workflows/device.yml` runs them on every pull request and on demand. It needs no
secrets: Android builds a release APK signed with the debug keystore that `expo prebuild` generates, and iOS
builds for the simulator with code signing off.

## What the flows prove

Every flow starts from a cleared app (`launchApp` with `clearState`) and needs no language pack. The app
starts downloading English when the leader continues in English; the flows pass whether that download
succeeds, is still running, or fails with no connection.

| Flow | Proves |
|---|---|
| `onboarding.yaml` | First launch shows the welcome, the language chooser opens and goes back, and continuing in English lands on Home |
| `tabs.yaml` | Home, Study and Formation each open from the tab bar and render |
| `theme.yaml` | Settings opens, the theme switches to dark, to light and back to following the phone; the Home theme button toggles and toggles back |
| `languages.yaml` | The language chip on Home opens the Languages modal and Close returns to Home |
| `download-language.yaml` | Tagged `optional`: downloads English from the catalog and opens it in Study. It needs the network and is allowed to fail |
| `reduced-blur.yaml` | Tagged `optional`: Settings turns reduced blur on, and Home, Study and Formation render with the plainer glass |
| `rtl.yaml` | Tagged `optional`: Settings switches the app language to Arabic, the app reloads right to left, and Home, Study and Formation render mirrored |
| `large-text.yaml` | Tagged `large-text`: with the largest system text (Android `font_scale` 2.0, iOS `accessibility-extra-extra-extra-large`) the welcome, Home, Study, Formation and Settings still reach their controls |

The three new flows are outside the required pass until each has run green twice in CI; move a flow into the
main set by removing its `optional` tag once it has. The CI build is made with `UW_LOCALE_GATE=drafts`, so the
drafted locales are offered and `rtl.yaml` can choose Arabic; a release build never is (`npm run bundle` fails if
the app config built without that variable does not embed the `reviewed` gate, or if any `eas.json` profile sets
it; `docs/proposals/2026-09-30-ci-drafts-gate.md`).

## Passes

`device/ci/android.sh` and `device/ci/ios.sh` take the passes to run, in order (`device/ci/passes.sh`):

| Pass | Flows | In CI |
|---|---|---|
| `main` | every flow tagged neither `optional` nor `large-text` | required: a failure fails the job |
| `optional` | the flows tagged `optional` | allowed to fail (`continue-on-error`) |
| `large-text` | the flows tagged `large-text`, with the system text set to its largest first and reset after | allowed to fail |

`common/start.yaml` is the shared start: clear the app, continue in English, wait for Home. Maestro runs only
the top-level files in `flows/`, so the shared start never runs on its own.

Each flow calls `takeScreenshot` at every screen. In CI the screenshots, the JUnit report, the Maestro debug
output and the device log (`logcat.txt` on Android, `simulator.log` on iOS) land in
`device-out/<platform>-<main|optional>/` and are uploaded as the `android-maestro` and `ios-maestro`
artifacts. The Android job also uploads the APK as `android-apk` and writes the APK size and the merged
manifest permissions (`aapt2 dump permissions`) to the job log and the job summary. Its last step diffs those
permissions against `scripts/checks/android-permissions.ts` with `scripts/apk-permissions.ts` and fails the job
on any permission that is neither admitted nor the app's own receiver permission, so a permission a Maven
dependency merges is caught (issue #26). Run it locally on a dump with
`npx tsx scripts/apk-permissions.ts device-out/apk-permissions.txt`.

Screenshots are also printed into the job log as base64 JPEG between `BEGIN-SHOT` and `END-SHOT` lines, for a
reviewer who cannot reach the artifact store.

## Caches

The workflow also runs on every push to `main`, which writes the caches pull requests read: Gradle (through
`gradle/actions/setup-gradle`, which writes only on `main`), the emulator's AVD and its boot snapshot
(`~/.android/avd`, created once per key by a boot with snapshot saving on), Maestro (`~/.maestro` without its
test output, keyed by `MAESTRO_VERSION`) and the CocoaPods download cache (`~/Library/Caches/CocoaPods` and
`~/.cocoapods/repos`). `ios/` and `android/` are never cached: `expo prebuild --clean` writes them fresh on
every run, and pods install into `ios/Pods` from the download cache.

## Run the flows locally

You need Node 22, Java 17 and Maestro (`curl -fsSL "https://get.maestro.mobile.dev" | bash`).

Android, with the Android SDK and a running emulator (API 30 or later):

```
npm ci
npx expo prebuild --platform android --no-install --clean
(cd android && ./gradlew :app:assembleRelease -PreactNativeArchitectures=x86_64)
adb install -r android/app/build/outputs/apk/release/app-release.apk
maestro test -e APP_ID=org.unfoldingword.app --exclude-tags optional device/flows
```

iOS, on a Mac with Xcode 26 or later and a booted iPhone simulator:

```
npm ci
npx expo prebuild --platform ios --clean
xcodebuild -workspace ios/unfoldingWord.xcworkspace -scheme unfoldingWord -configuration Release \
  -sdk iphonesimulator -destination "id=<simulator udid>" -derivedDataPath build \
  ONLY_ACTIVE_ARCH=YES CODE_SIGNING_ALLOWED=NO build
xcrun simctl install booted build/Build/Products/Release-iphonesimulator/unfoldingWord.app
maestro test -e APP_ID="$(/usr/libexec/PlistBuddy -c 'Print CFBundleIdentifier' build/Build/Products/Release-iphonesimulator/unfoldingWord.app/Info.plist)" \
  --exclude-tags optional device/flows
```

Every flow reads the app id from `APP_ID`, because the iOS bundle identifier and the Android package differ. Run one flow with `maestro test -e APP_ID=… device/flows/theme.yaml`, and the optional download with
`maestro test --include-tags optional device/flows`. Screenshots are written to the directory you run
Maestro from. Git ignores `android/` and `ios/`; delete the `build/` folder xcodebuild leaves when you are done.

## Writing a flow

Target controls by their accessible name, the same English string a screen reader announces, taken from
`src/lib/strings/en/`. Every control in the app has one, so no flow needs a `testID`. Maestro matches the
whole name as a regular expression, so escape parentheses and use `.*` for a name that carries a value, as
in `Change language, now .*`. Wait with `extendedWaitUntil` and a timeout rather than a fixed sleep, and mark
anything the system may or may not show, such as a permission prompt, `optional: true`.

## When a pass fails

`device/ci/android.sh` and `device/ci/ios.sh` run every flow once, and if that pass fails they run every flow a
second time and report the second result. Both passes print their failed steps. The second pass exists because
Maestro's driver drops view-hierarchy calls on the software-rendered API 30 emulator and a tap can land while a
screen is still animating; a regression in the app fails both passes. Screenshots are printed from the last pass.
