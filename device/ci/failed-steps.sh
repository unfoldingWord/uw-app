set -uo pipefail

for dir in "$@"; do
  [ -d "$dir" ] || continue
  find "$dir" -name 'commands-*.json' -newer "$GITHUB_WORKSPACE/package.json" -print0 | while IFS= read -r -d '' file; do
    grep -q '"FAILED"' "$file" || continue
    echo "== $(basename "$file")"
    python3 - "$file" <<'PY'
import json, sys
steps = json.load(open(sys.argv[1]))
for step in steps:
    meta = step.get("metadata", {})
    if meta.get("status") == "FAILED":
        print(json.dumps(step.get("command"))[:600])
        print(json.dumps(meta.get("error"))[:1200])
PY
  done
done
