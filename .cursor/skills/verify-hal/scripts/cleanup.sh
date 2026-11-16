#!/usr/bin/env bash
# Tear down the instance this run started. Evidence is never deleted.
# Usage: bash .cursor/skills/verify-hal/scripts/cleanup.sh

source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/common.sh"

if [[ ! -f "$HAL_VERIFY_CURRENT/pid" ]]; then
  echo "verify-hal cleanup: nothing to stop (no current pid)."
  exit 0
fi

PID="$(cat "$HAL_VERIFY_CURRENT/pid")"
PORT="$(cat "$HAL_VERIFY_CURRENT/port" 2>/dev/null || true)"
RUN_ID="$(cat "$HAL_VERIFY_CURRENT/run_id" 2>/dev/null || true)"
EVIDENCE="$(cat "$HAL_VERIFY_CURRENT/evidence" 2>/dev/null || true)"
LOG_DIR="$HAL_VERIFY_STATE_DIR/${RUN_ID:-unknown}"

echo "verify-hal cleanup: stopping pid $PID (port ${PORT:-unknown}); keeping evidence at ${EVIDENCE:-<none>}"

hal_verify_kill_tree "$PID"
hal_verify_wait_dead "$PID"

# If a descendant is still bound to our port, it belongs to this tree — kill those too.
if [[ -n "$PORT" ]]; then
  for lp in $(hal_verify_port_pids "$PORT"); do
    if [[ "$lp" == "$PID" ]] || hal_verify_is_descendant "$PID" "$lp"; then
      hal_verify_kill_tree "$lp"
      hal_verify_wait_dead "$lp"
    fi
  done
  leftover="$(hal_verify_port_pids "$PORT")"
  if [[ -n "$leftover" ]]; then
    echo "verify-hal cleanup: WARN: port $PORT still has listener(s) $leftover that are not in our pid tree. Leaving them alone."
  fi
fi

rm -rf "$HAL_VERIFY_CURRENT"
# Logs under /tmp are scratch, not evidence. Drop them with the instance.
rm -rf "$LOG_DIR"

if [[ -n "$EVIDENCE" && -d "$EVIDENCE" ]]; then
  echo "verify-hal cleanup: evidence still at $EVIDENCE"
  ls -la "$EVIDENCE" || true
else
  echo "verify-hal cleanup: no evidence directory recorded."
fi
