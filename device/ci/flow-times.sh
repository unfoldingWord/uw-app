set -uo pipefail

platform="$1"
run="$2"
shift 2

for dir in "$@"; do
  [ -d "$dir" ] || continue
  attempt="$(basename "$dir")"
  python3 - "$platform" "$run" "$attempt" "$dir" <<'PY'
import glob, json, os, sys
import xml.etree.ElementTree as tree

platform, run, attempt, directory = sys.argv[1:5]
for report in glob.glob(os.path.join(directory, "report.xml")):
    for case in tree.parse(report).getroot().iter("testcase"):
        failed = case.find("failure") is not None or case.find("error") is not None
        seconds = float(case.get("time") or 0)
        status = "failed" if failed else "passed"
        print(f"::notice title={platform} {run} {attempt}::{status} in {seconds:.0f} s: {case.get('name')}")
for commands in glob.glob(os.path.join(directory, "**", "commands-*.json"), recursive=True):
    try:
        steps = json.load(open(commands))
    except ValueError:
        continue
    for step in steps:
        if "ready offline" in json.dumps(step.get("command")):
            meta = step.get("metadata", {})
            milliseconds = meta.get("duration")
            if isinstance(milliseconds, (int, float)):
                print(f"::notice title={platform} {run} {attempt} download::waited {milliseconds / 1000:.0f} s for the language pack ({meta.get('status')})")
PY
done
