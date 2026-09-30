set -euo pipefail

apk="${APK_PATH:-android/app/build/outputs/apk/release/app-release.apk}"
tools="$(ls -d "$ANDROID_HOME"/build-tools/* | sort -V | tail -n 1)"
bytes="$(wc -c < "$apk" | tr -d ' ')"
megabytes="$(awk -v b="$bytes" 'BEGIN { printf "%.1f", b / 1048576 }')"
permissions="$("$tools/aapt2" dump permissions "$apk")"
dump="${APK_PERMISSIONS_DUMP:-device-out/apk-permissions.txt}"
mkdir -p "$(dirname "$dump")"
printf '%s\n' "$permissions" > "$dump"
badging="$("$tools/aapt2" dump badging "$apk" | grep -E "^(package|sdkVersion|targetSdkVersion|native-code)" || true)"

echo "APK: $apk"
echo "Size: $bytes bytes ($megabytes MB)"
echo "$badging"
echo "Merged manifest permissions:"
echo "$permissions"

{
  echo "## Android release APK"
  echo
  echo "Built for the emulator ABI only (x86_64), so this is not the size of a store download."
  echo
  echo "- Size: $bytes bytes ($megabytes MB)"
  echo
  echo '```'
  echo "$badging"
  echo '```'
  echo
  echo "### Merged manifest permissions"
  echo
  echo '```'
  echo "$permissions"
  echo '```'
} >> "${GITHUB_STEP_SUMMARY:-/dev/stdout}"
