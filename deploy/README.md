# Deploy

One Linux VM: Caddy (TLS) -> `pjsuite` (app + API on 127.0.0.1:8080) -> SQLite on local disk, replicated by Litestream to R2. Client and professional downloads of R2 files redirect to short-lived (5 min) presigned R2 URLs; bytes never pass through the VM.

## Prerequisites

- VM with a public IP, DNS `A` record for the domain, ports 80/443 open.
- R2 bucket for files, and a separate bucket (or path) for database backups. One API token with read/write on both.
- Caddy and Litestream installed on the VM (`litestream` at `/usr/local/bin/litestream`).

## Install (once)

```sh
sudo useradd --system --home /var/lib/pjsuite --shell /usr/sbin/nologin pjsuite
sudo install -d -o root -g root /opt/pjsuite /etc/pjsuite
sudo install -m 0640 -o root -g pjsuite deploy/pjsuite.env.example /etc/pjsuite/pjsuite.env
sudo install -m 0644 deploy/litestream.yml /etc/pjsuite/litestream.yml
sudo install -m 0644 deploy/pjsuite.service deploy/litestream.service /etc/systemd/system/
sudo install -m 0644 deploy/Caddyfile /etc/caddy/Caddyfile
```

Edit `/etc/pjsuite/pjsuite.env`: fill every `PJSUITE_R2_*` and `PJSUITE_BACKUP_*` value (file storage needs R2 in production; without it files land in a relative `files/` directory). Add `PJSUITE_DOMAIN=<your domain>` to Caddy's environment (`sudo systemctl edit caddy`, then `[Service]` / `Environment=PJSUITE_DOMAIN=...`).

## Deploy

From the repo root, on your machine:

```sh
pnpm install --frozen-lockfile
pnpm run build
(cd server && GOOS=linux GOARCH=amd64 CGO_ENABLED=0 go build -o bin/pjsuite-linux ./cmd/pjsuite)
scp server/bin/pjsuite-linux <vm>:/tmp/pjsuite
ssh <vm> 'sudo install -m 0755 /tmp/pjsuite /opt/pjsuite/pjsuite && sudo systemctl daemon-reload && sudo systemctl enable --now pjsuite litestream caddy && sudo systemctl restart pjsuite'
```

Check: `curl -fs https://<domain>/api/health`. Migrations run on start.

## Restore

Stop the app, restore from the replica, start again:

```sh
sudo systemctl stop litestream pjsuite
sudo -u pjsuite sh -c 'set -a; . /etc/pjsuite/pjsuite.env; set +a; mv "$PJSUITE_DB" "$PJSUITE_DB.broken" 2>/dev/null; litestream restore -config /etc/pjsuite/litestream.yml "$PJSUITE_DB"'
sudo systemctl start pjsuite litestream
```

Point-in-time: add `-timestamp <RFC3339>` to `litestream restore`. Before launch, also take a disk snapshot at your provider.

## CI

`.github/workflows/ci.yml` runs check, typecheck, test, build, `deploy/smoke.sh`, a Litestream replicate + restore round trip (`deploy/backup-check.sh`), and `caddy validate` on the Caddyfile. Deploys are manual.
