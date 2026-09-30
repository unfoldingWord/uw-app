set -uo pipefail

run="${1:-main}"
udid="${SIMULATOR_UDID:?SIMULATOR_UDID is not set}"
out="$GITHUB_WORKSPACE/device-out/ios-$run"
mkdir -p "$out"

if [ "$run" = "optional" ]; then
  tags=(--include-tags optional)
else
  tags=(--exclude-tags optional)
fi

bundle="$(/usr/libexec/PlistBuddy -c 'Print CFBundleIdentifier' "$GITHUB_WORKSPACE/build/Build/Products/Release-iphonesimulator/unfoldingWord.app/Info.plist")"
echo "Maestro drives $bundle"

run_flows() {
  local attempt="$1"
  mkdir -p "$out/$attempt"
  (
    cd "$out/$attempt" &&
      maestro --device "$udid" test "${tags[@]}" \
        -e APP_ID="$bundle" \
        --format junit --output report.xml \
        --test-output-dir . \
        --debug-output debug \
        "$GITHUB_WORKSPACE/device/flows"
  )
}

status=0
run_flows first || status=$?
if [ "$status" -ne 0 ]; then
  echo "::warning::The first pass failed; running every flow once more. A real regression fails both passes."
  status=0
  run_flows second || status=$?
fi

echo "::group::failed steps"
bash "$GITHUB_WORKSPACE/device/ci/failed-steps.sh" "$out" "$HOME/.maestro/tests"
echo "::endgroup::"

echo "::group::screenshots (base64 jpeg)"
last="$out/first"
[ -d "$out/second" ] && last="$out/second"
bash "$GITHUB_WORKSPACE/device/ci/print-shots.sh" "$last"
echo "::endgroup::"

xcrun simctl spawn "$udid" log show --style compact --last 20m \
  --predicate 'process == "unfoldingWord"' > "$out/simulator.log" 2>&1 || true
if [ "$status" -ne 0 ]; then
  echo "::group::simulator log (tail)"
  tail -n 400 "$out/simulator.log"
  echo "::endgroup::"
  echo "::group::crash reports"
  find "$HOME/Library/Logs/DiagnosticReports" -name '*unfoldingWord*' -newer "$GITHUB_WORKSPACE/package.json" 2>/dev/null | head -n 3 | while IFS= read -r report; do
    echo "== $report"
    head -c 12000 "$report"
    echo
  done
  echo "::endgroup::"
  echo "::group::console of one launch"
  xcrun simctl terminate "$udid" "$bundle" > /dev/null 2>&1 || true
  ( xcrun simctl launch --console-pty "$udid" "$bundle" 2>&1 & pid=$!; sleep 25; kill "$pid" 2>/dev/null ) | tail -n 150
  echo "::endgroup::"
fi
exit "$status"
