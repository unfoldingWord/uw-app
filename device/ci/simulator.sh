set -euo pipefail

uuid='[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}'
listing="$(xcrun simctl list devices available)"
echo "$listing"
udid=""
for name in "iPhone SE (3rd generation)" "iPhone 16e" "iPhone 17" "iPhone 16" "iPhone 15"; do
  udid="$(printf '%s\n' "$listing" | grep -F "    $name (" | tail -n 1 | grep -Eo "$uuid" || true)"
  if [ -n "$udid" ]; then
    break
  fi
done
if [ -z "$udid" ]; then
  udid="$(printf '%s\n' "$listing" | grep -E '^    iPhone ' | tail -n 1 | grep -Eo "$uuid")"
fi
xcrun simctl boot "$udid" || true
xcrun simctl bootstatus "$udid" -b
printf '%s\n' "$listing" | grep -F "$udid"
echo "SIMULATOR_UDID=$udid" >> "$GITHUB_ENV"
