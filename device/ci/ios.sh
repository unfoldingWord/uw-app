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

status=0
(
  cd "$out" &&
    maestro --device "$udid" test "${tags[@]}" \
      --format junit --output report.xml \
      --test-output-dir . \
      --debug-output debug \
      "$GITHUB_WORKSPACE/device/flows"
) || status=$?

echo "::group::screenshots (base64 jpeg)"
bash "$GITHUB_WORKSPACE/device/ci/print-shots.sh" "$out"
echo "::endgroup::"

xcrun simctl spawn "$udid" log show --style compact --last 20m \
  --predicate 'process == "unfoldingWord"' > "$out/simulator.log" 2>&1 || true
if [ "$status" -ne 0 ]; then
  echo "::group::simulator log (tail)"
  tail -n 400 "$out/simulator.log"
  echo "::endgroup::"
fi
exit "$status"
