set -uo pipefail

run="${1:-main}"
apk="${APK_PATH:-android/app/build/outputs/apk/release/app-release.apk}"
out="$GITHUB_WORKSPACE/device-out/android-$run"
mkdir -p "$out"

if [ "$run" = "optional" ]; then
  tags=(--include-tags optional)
else
  tags=(--exclude-tags optional)
fi

adb wait-for-device
adb install -r "$apk" || exit 1
adb logcat -c || true

aapt2="$(ls "$ANDROID_HOME"/build-tools/*/aapt2 2>/dev/null | sort -V | tail -n 1)"
package="$([ -n "$aapt2" ] && "$aapt2" dump packagename "$apk" 2>/dev/null | head -n 1)"
package="${package:-org.unfoldingword.app}"
echo "Maestro drives $package"

status=0
(
  cd "$out" &&
    maestro test "${tags[@]}" \
      -e APP_ID="$package" \
      --format junit --output report.xml \
      --test-output-dir . \
      --debug-output debug \
      "$GITHUB_WORKSPACE/device/flows"
) || status=$?

echo "::group::screenshots (base64 jpeg)"
bash "$GITHUB_WORKSPACE/device/ci/print-shots.sh" "$out" "$HOME/.maestro/tests"
echo "::endgroup::"

adb logcat -d > "$out/logcat.txt" || true
adb logcat -d -s ReactNativeJS:V ReactNative:V AndroidRuntime:E Expo:V unfoldingWord:V > "$out/app-log.txt" || true
if [ "$status" -ne 0 ]; then
  echo "::group::app log (tail)"
  tail -n 200 "$out/app-log.txt"
  echo "::endgroup::"
fi
exit "$status"
