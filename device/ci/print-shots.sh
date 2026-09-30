set -uo pipefail

out="${1:?output directory}"
width="${SHOT_WIDTH:-360}"
tmp="$(mktemp -d)"

find "$out" -name '*.png' -print0 | sort -z | while IFS= read -r -d '' png; do
  name="$(basename "$png" .png)"
  small="$tmp/$name.jpg"
  if command -v sips > /dev/null 2>&1; then
    sips -s format jpeg -s formatOptions 60 --resampleWidth "$width" "$png" --out "$small" > /dev/null 2>&1 || continue
  elif command -v convert > /dev/null 2>&1; then
    convert "$png" -resize "${width}x" -quality 60 "$small" || continue
  else
    continue
  fi
  echo "BEGIN-SHOT $name"
  base64 < "$small" | tr -d '\n'
  echo
  echo "END-SHOT $name"
done
rm -rf "$tmp"
