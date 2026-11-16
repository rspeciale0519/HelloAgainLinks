#!/usr/bin/env bash
# Shared paths and helpers for verify-hal. Source this file; do not execute it.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILL_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
REPO_ROOT="$(cd "$SKILL_DIR/../../.." && pwd)"
if command -v git >/dev/null 2>&1; then
  REPO_ROOT="$(git -C "$SCRIPT_DIR" rev-parse --show-toplevel)"
fi

HAL_VERIFY_PORT="${HAL_VERIFY_PORT:-4370}"
HAL_VERIFY_HOST="${HAL_VERIFY_HOST:-127.0.0.1}"
HAL_VERIFY_STATE_DIR="${HAL_VERIFY_STATE_DIR:-/tmp/hal-verify}"
HAL_VERIFY_CURRENT="$HAL_VERIFY_STATE_DIR/current"

# Env names the web app reads. Helpers never print values.
HAL_VERIFY_ENV_NAMES=(
  NEXT_PUBLIC_SUPABASE_URL
  NEXT_PUBLIC_SUPABASE_ANON_KEY
  SUPABASE_SERVICE_ROLE_KEY
  NEXT_PUBLIC_APP_URL
  X_CLIENT_ID
  X_CLIENT_SECRET
  XAI_API_KEY
  GROK_MODEL_FAST
  GROK_MODEL_FULL
  STRIPE_SECRET_KEY
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  STRIPE_WEBHOOK_SECRET
  BOOKMARK_SYNC_SECRET
  MOBILE_AUTH_HANDOFF_SECRET
  NEXT_PUBLIC_MOBILE_AUTH_CALLBACK_URL
)

hal_verify_run_id() {
  if [[ -n "${HAL_VERIFY_RUN_ID:-}" ]]; then
    printf '%s\n' "$HAL_VERIFY_RUN_ID"
    return
  fi
  if [[ -f "$HAL_VERIFY_CURRENT/run_id" ]]; then
    cat "$HAL_VERIFY_CURRENT/run_id"
    return
  fi
  date -u +%Y%m%dT%H%M%SZ
}

hal_verify_evidence_dir() {
  local run_id="$1"
  printf '%s\n' "${HAL_VERIFY_EVIDENCE_DIR:-$SKILL_DIR/evidence/$run_id}"
}

hal_verify_require_current() {
  if [[ ! -f "$HAL_VERIFY_CURRENT/pid" ]] || [[ ! -f "$HAL_VERIFY_CURRENT/url" ]]; then
    echo "verify-hal doctor: no current instance. Run launch first ($HAL_VERIFY_CURRENT is empty)." >&2
    return 1
  fi
}

# Kill a process and its descendants by pid, never by process name.
hal_verify_kill_tree() {
  local pid="$1"
  if [[ -z "$pid" ]] || ! kill -0 "$pid" 2>/dev/null; then
    return 0
  fi
  local child
  while read -r child; do
    [[ -n "$child" ]] && hal_verify_kill_tree "$child"
  done < <(pgrep -P "$pid" || true)
  kill -TERM "$pid" 2>/dev/null || true
}

hal_verify_wait_dead() {
  local pid="$1"
  local i
  for i in 1 2 3 4 5 6 7 8 9 10; do
    kill -0 "$pid" 2>/dev/null || return 0
    sleep 0.2
  done
  kill -KILL "$pid" 2>/dev/null || true
}

hal_verify_port_pids() {
  local port="$1"
  local pids=""
  if command -v ss >/dev/null 2>&1; then
    pids="$(ss -lptn "sport = :$port" 2>/dev/null | sed -n 's/.*pid=\([0-9]\+\).*/\1/p' | sort -u)"
  fi
  if [[ -z "$pids" ]] && command -v lsof >/dev/null 2>&1; then
    pids="$(lsof -t -iTCP:"$port" -sTCP:LISTEN 2>/dev/null || true)"
  fi
  if [[ -n "$pids" ]]; then
    printf '%s\n' "$pids"
    return
  fi
  python3 - "$port" <<'PY'
import os, sys
port = int(sys.argv[1])
hex_port = f"{port:04X}"
inodes = set()
for path in ("/proc/net/tcp", "/proc/net/tcp6"):
    try:
        lines = open(path, encoding="utf-8").read().splitlines()[1:]
    except OSError:
        continue
    for line in lines:
        parts = line.split()
        if len(parts) < 10:
            continue
        local, state, inode = parts[1], parts[3], parts[9]
        if state != "0A":
            continue
        if local.rsplit(":", 1)[-1].upper() == hex_port:
            inodes.add(inode)
if not inodes:
    sys.exit(0)
pids = []
for pid in os.listdir("/proc"):
    if not pid.isdigit():
        continue
    fd_dir = f"/proc/{pid}/fd"
    try:
        names = os.listdir(fd_dir)
    except OSError:
        continue
    for fd in names:
        try:
            target = os.readlink(f"{fd_dir}/{fd}")
        except OSError:
            continue
        if target.startswith("socket:[") and target[8:-1] in inodes:
            pids.append(pid)
            break
print("\n".join(sorted(pids, key=int)))
PY
}

hal_verify_is_descendant() {
  local ancestor="$1"
  local candidate="$2"
  local cur="$candidate"
  local i
  for i in $(seq 1 32); do
    [[ "$cur" == "$ancestor" ]] && return 0
    cur="$(ps -o ppid= -p "$cur" 2>/dev/null | tr -d ' ')"
    [[ -z "$cur" || "$cur" == "0" || "$cur" == "1" ]] && break
  done
  return 1
}

# Names only. Never print values.
hal_verify_env_report() {
  local name
  local set_names=()
  local missing=()
  local placeholder=0
  for name in "${HAL_VERIFY_ENV_NAMES[@]}"; do
    if [[ -n "${!name:-}" ]]; then
      set_names+=("$name")
      case "${!name}" in
        *verification-placeholder*|*your-project.supabase.co*|*your-anon-key*|*your-x-client*|*xai-your-api-key*|*sk_test_...*)
          placeholder=1
          ;;
      esac
    else
      missing+=("$name")
    fi
  done
  printf 'env_set=%s\n' "$(IFS=,; echo "${set_names[*]:-}")"
  printf 'env_unset=%s\n' "$(IFS=,; echo "${missing[*]:-}")"
  printf 'env_placeholder=%s\n' "$placeholder"
}
