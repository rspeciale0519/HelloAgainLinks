#!/usr/bin/env bash
# Run the repo's real install/build/lint/typecheck/test commands and record results.
# Does not start the app. Writes JSON to the evidence dir when one exists.
# Usage: bash .cursor/skills/verify-hal/scripts/gates.sh

source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/common.sh"

RUN_ID="$(hal_verify_run_id)"
EVIDENCE_DIR="$(hal_verify_evidence_dir "$RUN_ID")"
mkdir -p "$EVIDENCE_DIR"
REPORT="$EVIDENCE_DIR/gates.json"
LOG="$EVIDENCE_DIR/gates.log"
RESULTS="$EVIDENCE_DIR/gates.tsv"

cd "$REPO_ROOT"
: >"$LOG"
: >"$RESULTS"

run_gate() {
  local name="$1"
  local cmd="$2"
  local expected_missing="${3:-0}"
  echo "======== $name: $cmd ========" | tee -a "$LOG" >&2
  local start end elapsed status result
  start="$(date +%s)"
  set +e
  bash -lc "$cmd" >>"$LOG" 2>&1
  status=$?
  set -e
  end="$(date +%s)"
  elapsed=$((end - start))
  result="fail"
  if [[ "$expected_missing" == "1" ]]; then
    if [[ "$status" != "0" ]]; then
      result="missing"
    else
      result="unexpected-pass"
    fi
  elif [[ "$status" == "0" ]]; then
    result="pass"
  fi
  echo "verify-hal gates: $name -> $result (exit $status, ${elapsed}s)" >&2
  printf '%s\t%s\t%s\t%s\t%s\n' "$name" "$result" "$status" "$elapsed" "$cmd" >>"$RESULTS"
}

echo "verify-hal gates: logging to $LOG" >&2

run_gate install "pnpm install --frozen-lockfile"
run_gate build "pnpm build"
run_gate lint "pnpm lint"
run_gate typecheck-ui-hal "pnpm --filter @helloagain/ui-hal type-check"
run_gate typecheck-web "pnpm --filter @helloagain/web exec tsc --noEmit"
run_gate tests "pnpm test" 1

python3 - "$REPORT" "$RESULTS" "$REPO_ROOT" <<'PY'
import json, sys
from datetime import datetime, timezone
report_path, tsv_path, repo = sys.argv[1:4]
checks = []
with open(tsv_path, encoding="utf-8") as f:
    for line in f:
        line = line.rstrip("\n")
        if not line:
            continue
        name, result, status, elapsed, cmd = line.split("\t", 4)
        checks.append({
            "name": name,
            "result": result,
            "exit": int(status),
            "seconds": int(elapsed),
            "command": cmd,
        })
payload = {
    "repo": "Hello Again Links",
    "cwd": repo,
    "recorded_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
    "checks": checks,
}
with open(report_path, "w", encoding="utf-8") as f:
    json.dump(payload, f, indent=2)
    f.write("\n")
print(json.dumps(payload, indent=2))
PY

echo "verify-hal gates: wrote $REPORT" >&2
