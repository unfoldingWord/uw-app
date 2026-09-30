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

status=0
(
  cd "$out" &&
    maestro test "${tags[@]}" \
      --format junit --output report.xml \
      --test-output-dir . \
      --debug-output debug \
      "$GITHUB_WORKSPACE/device/flows"
) || status=$?

adb logcat -d > "$out/logcat.txt" || true
if [ "$status" -ne 0 ]; then
  echo "::group::adb logcat (tail)"
  tail -n 400 "$out/logcat.txt"
  echo "::endgroup::"
fi
exit "$status"
