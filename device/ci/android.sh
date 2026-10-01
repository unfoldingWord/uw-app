set -uo pipefail

source "$GITHUB_WORKSPACE/device/ci/passes.sh"

apk="${APK_PATH:-android/app/build/outputs/apk/release/app-release.apk}"
passes=("$@")
[ "${#passes[@]}" -eq 0 ] && passes=(main)

adb wait-for-device
adb install -r "$apk" || exit 1

aapt2="$(ls "$ANDROID_HOME"/build-tools/*/aapt2 2>/dev/null | sort -V | tail -n 1)"
package="$([ -n "$aapt2" ] && "$aapt2" dump packagename "$apk" 2>/dev/null | head -n 1)"
package="${package:-org.unfoldingword.app}"
echo "Maestro drives $package"

set_text_scale() {
  adb shell settings put system font_scale "$1" || true
  echo "font_scale is now $(adb shell settings get system font_scale | tr -d '\r')"
}

run_flows() {
  local out="$1" attempt="$2" tags="$3"
  mkdir -p "$out/$attempt"
  (
    cd "$out/$attempt" &&
      maestro test "$tags" \
        -e APP_ID="$package" \
        --format junit --output report.xml \
        --test-output-dir . \
        --debug-output debug \
        "$GITHUB_WORKSPACE/device/flows"
  )
}

run_pass() {
  local run="$1" tags out status
  tags="$(pass_tags "$run")" || return 2
  out="$GITHUB_WORKSPACE/device-out/android-$run"
  mkdir -p "$out"
  adb logcat -c || true
  [ "$run" = "large-text" ] && set_text_scale 2.0

  status=0
  run_flows "$out" first "$tags" || status=$?
  if [ "$status" -ne 0 ]; then
    echo "::warning::The first $run pass failed; running its flows once more. A real regression fails both passes."
    status=0
    run_flows "$out" second "$tags" || status=$?
  fi

  [ "$run" = "large-text" ] && set_text_scale 1.0

  echo "::group::$run: failed steps"
  bash "$GITHUB_WORKSPACE/device/ci/failed-steps.sh" "$out" "$HOME/.maestro/tests"
  echo "::endgroup::"

  echo "::group::$run: screenshots (base64 jpeg)"
  local last="$out/first"
  [ -d "$out/second" ] && last="$out/second"
  bash "$GITHUB_WORKSPACE/device/ci/print-shots.sh" "$last"
  echo "::endgroup::"

  adb logcat -d > "$out/logcat.txt" || true
  adb logcat -d -s ReactNativeJS:V ReactNative:V AndroidRuntime:E Expo:V unfoldingWord:V > "$out/app-log.txt" || true
  if [ "$status" -ne 0 ]; then
    echo "::group::$run: app log (tail)"
    tail -n 200 "$out/app-log.txt"
    echo "::endgroup::"
  fi
  return "$status"
}

overall=0
for run in "${passes[@]}"; do
  run_pass "$run" || overall=1
done
exit "$overall"
