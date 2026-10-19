#!/usr/bin/env bash
set -euo pipefail

bin="${1:-server/bin/pjsuite}"
addr="127.0.0.1:${PJSUITE_SMOKE_PORT:-18080}"
work="$(mktemp -d)"
trap 'kill "${pid:-}" 2>/dev/null || true; rm -rf "$work"' EXIT

PJSUITE_ADDR="$addr" PJSUITE_DB="$work/smoke.db" PJSUITE_FILES="$work/files" "$bin" >"$work/log" 2>&1 &
pid=$!

for _ in $(seq 50); do
  curl -fs "http://$addr/api/health" >/dev/null && break
  sleep 0.2
done

fail() { echo "smoke: $1" >&2; cat "$work/log" >&2; exit 1; }

curl -fs "http://$addr/api/health" | grep -q '"ok"' || fail "/api/health not ok"
curl -fs "http://$addr/" | grep -q '<div id="root"' || fail "/ is not the app shell"
curl -fs "http://$addr/projetos/1/montagem" | grep -q '<div id="root"' || fail "deep SPA route is not the app shell"
[ "$(curl -s -o /dev/null -w '%{http_code}' "http://$addr/api/nope")" = 404 ] || fail "/api/nope is not 404"

echo "smoke: ok"
