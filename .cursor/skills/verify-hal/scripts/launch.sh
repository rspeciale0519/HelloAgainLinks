#!/usr/bin/env bash
# Start a disposable Hello Again Links web instance for verification.
# Usage: bash .cursor/skills/verify-hal/scripts/launch.sh
# Env: HAL_VERIFY_PORT (default 4370), HAL_VERIFY_RUN_ID, HAL_VERIFY_FORCE=1

source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/common.sh"

READY_TIMEOUT="${HAL_VERIFY_READY_TIMEOUT:-120}"
PORT="$HAL_VERIFY_PORT"
HOST="$HAL_VERIFY_HOST"
URL="http://${HOST}:${PORT}"
mkdir -p "$HAL_VERIFY_STATE_DIR"

if [[ -f "$HAL_VERIFY_CURRENT/pid" ]]; then
  existing_pid="$(cat "$HAL_VERIFY_CURRENT/pid")"
  if kill -0 "$existing_pid" 2>/dev/null; then
    if [[ "${HAL_VERIFY_FORCE:-0}" == "1" ]]; then
      echo "verify-hal launch: HAL_VERIFY_FORCE=1, tearing down pid $existing_pid"
      bash "$SCRIPT_DIR/cleanup.sh"
    else
      echo "verify-hal launch: refusing to double-drive. pid $existing_pid is still alive at $(cat "$HAL_VERIFY_CURRENT/url" 2>/dev/null || echo unknown)." >&2
      echo "Run cleanup, or set HAL_VERIFY_FORCE=1." >&2
      exit 1
    fi
  fi
fi

listeners="$(hal_verify_port_pids "$PORT")"
if [[ -n "$listeners" ]]; then
  echo "verify-hal launch: port $PORT is already in use by pid(s): $listeners" >&2
  echo "Pick another HAL_VERIFY_PORT or stop that listener. Do not steal a shared instance." >&2
  exit 1
fi

# Mint the run id AFTER any forced cleanup. Reusing the previous id would
# point LOG_DIR at a folder cleanup just deleted, and the server would never start.
if [[ -n "${HAL_VERIFY_RUN_ID:-}" ]]; then
  RUN_ID="$HAL_VERIFY_RUN_ID"
else
  RUN_ID="$(date -u +%Y%m%dT%H%M%SZ)"
fi
EVIDENCE_DIR="$(hal_verify_evidence_dir "$RUN_ID")"
LOG_DIR="$HAL_VERIFY_STATE_DIR/$RUN_ID"
mkdir -p "$LOG_DIR" "$EVIDENCE_DIR"

# Load developer env if present (values never printed). Else verification placeholders.
ENV_SOURCE="placeholders"
if [[ -f "$REPO_ROOT/apps/web/.env.local" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "$REPO_ROOT/apps/web/.env.local"
  set +a
  ENV_SOURCE="apps/web/.env.local"
else
  export NEXT_PUBLIC_SUPABASE_URL="${NEXT_PUBLIC_SUPABASE_URL:-https://verification-placeholder.supabase.co}"
  export NEXT_PUBLIC_SUPABASE_ANON_KEY="${NEXT_PUBLIC_SUPABASE_ANON_KEY:-eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJpc3MiOiJoYWwtdmVyaWZpY2F0aW9uLXBsYWNlaG9sZGVyIiwicm9sZSI6ImFub24ifQ.placeholder}"
  export SUPABASE_SERVICE_ROLE_KEY="${SUPABASE_SERVICE_ROLE_KEY:-verification-placeholder}"
  export X_CLIENT_ID="${X_CLIENT_ID:-verification-placeholder}"
  export X_CLIENT_SECRET="${X_CLIENT_SECRET:-verification-placeholder}"
fi
export NEXT_PUBLIC_APP_URL="${NEXT_PUBLIC_APP_URL:-$URL}"
export NEXT_TELEMETRY_DISABLED="${NEXT_TELEMETRY_DISABLED:-1}"

if [[ ! -d "$REPO_ROOT/node_modules" ]]; then
  echo "verify-hal launch: node_modules missing. Run: pnpm install --frozen-lockfile" >&2
  exit 1
fi

# @helloagain/ui and @helloagain/shared resolve from dist/. next transpilePackages
# does not emit those. Build them so a cold checkout can serve `/`.
echo "verify-hal launch: building @helloagain/shared and @helloagain/ui"
(
  cd "$REPO_ROOT"
  pnpm --filter @helloagain/shared build
  pnpm --filter @helloagain/ui build
)

LOG_FILE="$LOG_DIR/next.log"
# Own process tree rooted at this pid. Cleanup walks descendants of this pid only.
(
  cd "$REPO_ROOT"
  exec pnpm --filter @helloagain/web exec next dev --hostname "$HOST" --port "$PORT"
) >"$LOG_FILE" 2>&1 &
NEXT_PID=$!

mkdir -p "$HAL_VERIFY_CURRENT"
printf '%s\n' "$RUN_ID" >"$HAL_VERIFY_CURRENT/run_id"
printf '%s\n' "$NEXT_PID" >"$HAL_VERIFY_CURRENT/pid"
printf '%s\n' "$PORT" >"$HAL_VERIFY_CURRENT/port"
printf '%s\n' "$URL" >"$HAL_VERIFY_CURRENT/url"
printf '%s\n' "$HOST" >"$HAL_VERIFY_CURRENT/host"
printf '%s\n' "$LOG_FILE" >"$HAL_VERIFY_CURRENT/log"
printf '%s\n' "$EVIDENCE_DIR" >"$HAL_VERIFY_CURRENT/evidence"
printf '%s\n' "$ENV_SOURCE" >"$HAL_VERIFY_CURRENT/env_source"
date -u +%Y-%m-%dT%H:%M:%SZ >"$HAL_VERIFY_CURRENT/started_at"

cleanup_on_fail() {
  echo "verify-hal launch: readiness failed; killing pid $NEXT_PID" >&2
  hal_verify_kill_tree "$NEXT_PID"
  hal_verify_wait_dead "$NEXT_PID"
  rm -rf "$HAL_VERIFY_CURRENT"
}
trap cleanup_on_fail EXIT

echo "verify-hal launch: pid=$NEXT_PID url=$URL run_id=$RUN_ID env_source=$ENV_SOURCE"
echo "verify-hal launch: waiting up to ${READY_TIMEOUT}s for a usable home page"

deadline=$((SECONDS + READY_TIMEOUT))
ready=0
while (( SECONDS < deadline )); do
  if ! kill -0 "$NEXT_PID" 2>/dev/null; then
    echo "verify-hal launch: next process exited. Last log lines:" >&2
    tail -n 40 "$LOG_FILE" >&2 || true
    exit 1
  fi
  body="$(curl -fsS --max-time 2 "$URL/" 2>/dev/null || true)"
  if printf '%s' "$body" | grep -Eq 'Hello Again Links|Your X Bookmarks'; then
    ready=1
    break
  fi
  sleep 1
done

if [[ "$ready" != "1" ]]; then
  echo "verify-hal launch: home page never became usable. Last log lines:" >&2
  tail -n 60 "$LOG_FILE" >&2 || true
  exit 1
fi

trap - EXIT
echo "verify-hal launch: ready at $URL"
echo "verify-hal launch: evidence dir $EVIDENCE_DIR"
echo "verify-hal launch: two next-dev processes on one checkout share apps/web/.next — do not launch a second copy."
hal_verify_env_report | tee "$HAL_VERIFY_CURRENT/env_report"
