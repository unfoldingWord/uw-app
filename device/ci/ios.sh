set -uo pipefail

source "$GITHUB_WORKSPACE/device/ci/passes.sh"

udid="${SIMULATOR_UDID:?SIMULATOR_UDID is not set}"
passes=("$@")
[ "${#passes[@]}" -eq 0 ] && passes=(main)

bundle="$(/usr/libexec/PlistBuddy -c 'Print CFBundleIdentifier' "$GITHUB_WORKSPACE/build/Build/Products/Release-iphonesimulator/unfoldingWord.app/Info.plist")"
echo "Maestro drives $bundle"

set_text_size() {
  xcrun simctl ui "$udid" content_size "$1" || true
  echo "content size is now $(xcrun simctl ui "$udid" content_size 2>/dev/null || echo unknown)"
}

content_hosts="git.door43.org cdn.door43.org unfoldingword.org"
hosts_marker="uw-device-ci-content-offline"

content_offline() {
  printf '127.0.0.1 %s # %s\n' "$content_hosts" "$hosts_marker" | sudo tee -a /etc/hosts > /dev/null
  sudo dscacheutil -flushcache 2>/dev/null || true
  sudo killall -HUP mDNSResponder 2>/dev/null || true
  echo "the $1 pass runs with $content_hosts resolving to this machine, so no language pack downloads during it"
}

content_online() {
  sudo sed -i '' "/$hosts_marker/d" /etc/hosts
  sudo dscacheutil -flushcache 2>/dev/null || true
  sudo killall -HUP mDNSResponder 2>/dev/null || true
}

run_flows() {
  local out="$1" attempt="$2" tags="$3"
  mkdir -p "$out/$attempt"
  (
    cd "$out/$attempt" &&
      maestro --device "$udid" test "$tags" \
        -e APP_ID="$bundle" \
        --format junit --output report.xml \
        --test-output-dir . \
        --debug-output debug \
        "$GITHUB_WORKSPACE/device/flows"
  )
}

report_failure() {
  local out="$1" run="$2"
  echo "::group::$run: simulator log (tail)"
  tail -n 400 "$out/simulator.log"
  echo "::endgroup::"
  echo "::group::$run: crash reports"
  find "$HOME/Library/Logs/DiagnosticReports" -name '*unfoldingWord*' -newer "$GITHUB_WORKSPACE/package.json" 2>/dev/null | head -n 3 | while IFS= read -r report; do
    echo "== $report"
    head -c 12000 "$report"
    echo
  done
  echo "::endgroup::"
  echo "::group::$run: console of one launch"
  xcrun simctl terminate "$udid" "$bundle" > /dev/null 2>&1 || true
  ( xcrun simctl launch --console-pty "$udid" "$bundle" 2>&1 & pid=$!; sleep 25; kill "$pid" 2>/dev/null ) | tail -n 150
  echo "::endgroup::"
}

run_pass() {
  local run="$1" tags out status
  tags="$(pass_tags "$run")" || return 2
  out="$GITHUB_WORKSPACE/device-out/ios-$run"
  mkdir -p "$out"
  [ "$run" = "large-text" ] && set_text_size accessibility-extra-extra-extra-large
  [ "$run" = "main" ] && content_offline "$run"

  status=0
  run_flows "$out" first "$tags" || status=$?
  if [ "$status" -ne 0 ]; then
    echo "::warning::The first $run pass failed; running its flows once more. A real regression fails both passes."
    status=0
    run_flows "$out" second "$tags" || status=$?
  fi

  [ "$run" = "main" ] && content_online
  [ "$run" = "large-text" ] && set_text_size large

  echo "::group::$run: failed steps"
  bash "$GITHUB_WORKSPACE/device/ci/failed-steps.sh" "$out" "$HOME/.maestro/tests"
  echo "::endgroup::"

  echo "::group::$run: screenshots (base64 jpeg)"
  local last="$out/first"
  [ -d "$out/second" ] && last="$out/second"
  bash "$GITHUB_WORKSPACE/device/ci/print-shots.sh" "$last"
  echo "::endgroup::"

  xcrun simctl spawn "$udid" log show --style compact --last 20m \
    --predicate 'process == "unfoldingWord"' > "$out/simulator.log" 2>&1 || true
  [ "$status" -ne 0 ] && report_failure "$out" "$run"
  return "$status"
}

overall=0
for run in "${passes[@]}"; do
  run_pass "$run" || overall=1
done
exit "$overall"
