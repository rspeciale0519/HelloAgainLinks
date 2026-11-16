#!/usr/bin/env bash
# Read-only: is the current verify-hal instance worth driving?
# Usage: bash .cursor/skills/verify-hal/scripts/doctor.sh
# Exit 0 only when pid, port ownership, and home-page identity all match.

source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/common.sh"

hal_verify_require_current

PID="$(cat "$HAL_VERIFY_CURRENT/pid")"
PORT="$(cat "$HAL_VERIFY_CURRENT/port")"
URL="$(cat "$HAL_VERIFY_CURRENT/url")"
RUN_ID="$(cat "$HAL_VERIFY_CURRENT/run_id")"
ENV_SOURCE="$(cat "$HAL_VERIFY_CURRENT/env_source" 2>/dev/null || echo unknown)"
LOG_FILE="$(cat "$HAL_VERIFY_CURRENT/log" 2>/dev/null || true)"

fail() {
  echo "verify-hal doctor: FAIL: $*" >&2
  echo "pid=$PID url=$URL run_id=$RUN_ID"
  exit 1
}

if ! kill -0 "$PID" 2>/dev/null; then
  fail "recorded pid $PID is not running"
fi

cmdline="$(tr '\0' ' ' <"/proc/$PID/cmdline" 2>/dev/null || ps -o args= -p "$PID")"
case "$cmdline" in
  *next*|*@helloagain/web*|*"pnpm --filter @helloagain/web"*)
    ;;
  *)
    fail "pid $PID cmdline does not look like the launched next dev ($cmdline)"
    ;;
esac

listeners="$(hal_verify_port_pids "$PORT")"
if [[ -z "$listeners" ]]; then
  fail "nothing is listening on port $PORT"
fi
owned=0
for lp in $listeners; do
  if [[ "$lp" == "$PID" ]] || hal_verify_is_descendant "$PID" "$lp"; then
    owned=1
    break
  fi
done
if [[ "$owned" != "1" ]]; then
  fail "port $PORT is owned by pid(s) $listeners, not by our tree (pid $PID). Refusing to drive a shared instance."
fi

body="$(curl -fsS --max-time 5 "$URL/" || true)"
if ! printf '%s' "$body" | grep -Eq 'Hello Again Links|Your X Bookmarks'; then
  fail "GET $URL/ did not contain the HAL identity. Not a usable instance."
fi

login_body="$(curl -fsS --max-time 5 "$URL/login" || true)"
if ! printf '%s' "$login_body" | grep -q 'Continue with X'; then
  echo "verify-hal doctor: WARN: GET $URL/login did not contain 'Continue with X' (client-rendered pages can omit it from the HTML shell)."
fi

auth_driveable=1
case "$ENV_SOURCE" in
  placeholders) auth_driveable=0 ;;
esac
if [[ "${NEXT_PUBLIC_SUPABASE_URL:-}" == *verification-placeholder* ]] || \
   [[ "${X_CLIENT_ID:-}" == *verification-placeholder* ]]; then
  auth_driveable=0
fi

echo "verify-hal doctor: OK"
echo "url=$URL"
echo "port=$PORT"
echo "pid=$PID"
echo "run_id=$RUN_ID"
echo "app=Hello Again Links"
echo "surface=web-next-dev"
echo "env_source=$ENV_SOURCE"
echo "auth_driveable=$auth_driveable"
if [[ -n "$LOG_FILE" ]]; then
  echo "log=$LOG_FILE"
fi
if [[ "$auth_driveable" != "1" ]]; then
  echo "note=Authenticated dashboard/X-OAuth flows are blocked without a real local env (names in apps/web/.env.example). Drive public pages only."
fi
if [[ -f "$HAL_VERIFY_CURRENT/env_report" ]]; then
  cat "$HAL_VERIFY_CURRENT/env_report"
else
  hal_verify_env_report
fi
