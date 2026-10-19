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
sqlite3 "$work/pjsuite.db" ".timeout 5000" "INSERT INTO users (email, name, password_hash) VALUES ('backup@check.test', 'Backup Check', 'x')" || fail "insert failed"
sleep 3

litestream restore -config "$work/litestream.yml" -o "$work/restored.db" "$work/pjsuite.db" >/dev/null 2>&1 || fail "restore failed"

[ "$(sqlite3 "$work/restored.db" "PRAGMA integrity_check")" = "ok" ] || fail "restored database corrupt"
query="SELECT COUNT(*) FROM users WHERE email = 'backup@check.test'"
[ "$(sqlite3 "$work/restored.db" "$query")" = "1" ] || fail "inserted row missing from restored database"

echo "backup-check: ok"
