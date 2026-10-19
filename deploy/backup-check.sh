#!/usr/bin/env bash
set -euo pipefail

bin="${1:-server/bin/pjsuite}"
addr="127.0.0.1:${PJSUITE_SMOKE_PORT:-18081}"
work="$(mktemp -d)"
trap 'kill "${app:-}" "${repl:-}" 2>/dev/null || true; rm -rf "$work"' EXIT

cat >"$work/litestream.yml" <<EOF
dbs:
  - path: $work/pjsuite.db
    replica:
      type: file
      path: $work/replica
EOF

PJSUITE_ADDR="$addr" PJSUITE_DB="$work/pjsuite.db" PJSUITE_FILES="$work/files" "$bin" >"$work/app.log" 2>&1 &
app=$!
for _ in $(seq 50); do
  curl -fs "http://$addr/api/health" >/dev/null && break
  sleep 0.2
done

litestream replicate -config "$work/litestream.yml" >"$work/replicate.log" 2>&1 &
repl=$!

fail() { echo "backup-check: $1" >&2; cat "$work/app.log" "$work/replicate.log" >&2; exit 1; }

for _ in $(seq 50); do
  [ -d "$work/replica" ] && [ -n "$(ls -A "$work/replica")" ] && break
  sleep 0.2
done
[ -n "$(ls -A "$work/replica" 2>/dev/null)" ] || fail "nothing replicated"
sleep 2

litestream restore -config "$work/litestream.yml" -o "$work/restored.db" "$work/pjsuite.db" >/dev/null 2>&1 || fail "restore failed"

query="SELECT COUNT(*) FROM goose_db_version"
[ "$(sqlite3 "$work/restored.db" "$query")" = "$(sqlite3 "$work/pjsuite.db" "$query")" ] || fail "restored database differs"

echo "backup-check: ok"
