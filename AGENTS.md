# PJ Suite

Monorepo. `web/`: React 19 SPA on Vite+ (`vite-plus`, local), pnpm workspaces, Tailwind 4, Radix/shadcn, TanStack Router (file-based, `web/src/routes`, `routeTree.gen.ts` generated). `server/`: Go, Echo v5, SQLite (modernc, pure Go, no cgo). pt-BR UI.

## Commands

All from repo root (pnpm workspaces `web`, `server`; tasks run via `vp run`; `pnpm install --no-frozen-lockfile` when changing deps locally).

- dev: `pnpm run dev` (web :5173 proxies `/api` to server :8080; env `PJSUITE_ADDR`, `PJSUITE_DB` default `pjsuite.db`; attachments go to `PJSUITE_FILES` default `files/`, or R2 when all of `PJSUITE_R2_ACCOUNT_ID`, `PJSUITE_R2_ACCESS_KEY_ID`, `PJSUITE_R2_SECRET_ACCESS_KEY`, `PJSUITE_R2_BUCKET` are set; partial R2 config fails startup)
- check: `pnpm run check` (oxfmt + oxlint + gofumpt + go vet); typecheck: `cd web && pnpm exec tsc --noEmit`
- test: `pnpm run test` (vitest in web, `go test` in server); single Go test: `cd server && go test ./internal/... -run Name`
- build: `pnpm run build` (web builds into `server/internal/webui/dist`, then `server/bin/pjsuite` embeds it; the committed `dist/index.html` is a placeholder — don't commit the built one)
- smoke: `deploy/smoke.sh [binary]`; backup round trip: `deploy/backup-check.sh [binary]` (needs `litestream`, `sqlite3`); deploy runbook `deploy/README.md`; CI `.github/workflows/ci.yml`

## Layout

- `web/src/ui.tsx` shared Field/Choice/Badge/Banner/Blank/Loading/Avatar/FileRow/UploadBox/Timeline
- `web/src/catalog.ts` inventory of the 34 screens (ids, states, exclusions, next step)
- `web/src/globals.css` tokens/foundations, `product.css` component classes
- `web/src/components/ui/` vendored shadcn primitives (excluded from fmt/lint; do not restyle in place)
- `web/public/brand`, `web/public/tokens.json` brand assets and tokens
- `server/cmd/pjsuite` entrypoint; `server/internal/api` Echo routes under `/api`, plus the SPA fallback from `server/internal/webui`; `server/internal/store` SQLite open + goose migrate; `server/internal/storage` file store interface (Dir, R2, Memory; `Signer` for R2 presigned downloads, 302 from `streamObject`); `server/migrations` SQL
- `deploy/` Caddyfile, systemd units, litestream.yml, env example, smoke/backup scripts, runbook
- `design/` DESIGN.md, SCREEN-SPECS.md, `prototype/` reference code (never import)

## Conventions

- UI: only tokens from `web/public/tokens.json`/`web/src/globals.css` and components from `web/src/components/ui` + `web/src/ui.tsx`; no ad-hoc colors, spacing, fonts. Reference: `design/DESIGN.md`, `design/SCREEN-SPECS.md`, `design/prototype/product.tsx`.
- Light mode only. Professional operates the app; client uses a link portal, no client account.
- Signed contract versions are immutable; edits create a new version. Internal tasks/notes never reach client views.
- Client-visible data is built only by `buildClientView` (`server/internal/api/clientview.go`); contract versions are stored snapshots of it (`contract_versions`), never recomputed from live data.
- SQLite only; single connection, WAL, foreign keys on. Schema changes: new goose SQL file in `server/migrations/` (embedded, auto-applied on start).

## Skills

- Editing .ts/.tsx: use `typescript` if available.
- Editing .go: use `go` if available.
- Writing code: use `lean-code` if available.
