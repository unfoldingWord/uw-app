set -uo pipefail

width="${SHOT_WIDTH:-360}"
tmp="$(mktemp -d)"

shrink() {
  if command -v sips > /dev/null 2>&1; then
    sips -s format jpeg -s formatOptions 60 --resampleWidth "$width" "$1" --out "$2" > /dev/null 2>&1
  elif command -v magick > /dev/null 2>&1; then
    magick "$1" -resize "${width}x" -quality 60 "$2"
  elif command -v convert > /dev/null 2>&1; then
    convert "$1" -resize "${width}x" -quality 60 "$2"
  else
    return 1
  fi
}

for dir in "$@"; do
  [ -d "$dir" ] && find "$dir" -maxdepth 4 -type f | head -n 60
done

for dir in "$@"; do
  [ -d "$dir" ] || continue
  find "$dir" -name '*.png' -newer "$GITHUB_WORKSPACE/package.json" -print0 | sort -z | while IFS= read -r -d '' png; do
    name="$(basename "$png" .png)"
    small="$tmp/$name.jpg"
    if shrink "$png" "$small"; then
      echo "BEGIN-SHOT $name.jpg"
      base64 < "$small" | tr -d '\n'
    else
      echo "BEGIN-SHOT $name.png"
      base64 < "$png" | tr -d '\n'
    fi
    echo
    echo "END-SHOT $name"
  done
done
rm -rf "$tmp"
