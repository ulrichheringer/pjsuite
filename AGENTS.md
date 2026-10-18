# PJ Suite

Monorepo. `web/`: React 19 SPA on Vite+ (`vite-plus`, local), pnpm workspaces, Tailwind 4, Radix/shadcn, TanStack Router (file-based, `web/src/routes`, `routeTree.gen.ts` generated). `server/`: Go, Echo v5, SQLite (modernc, pure Go, no cgo). pt-BR UI.

## Commands

All from repo root (pnpm workspaces `web`, `server`; tasks run via `vp run`; `pnpm install --no-frozen-lockfile` when changing deps locally).

- dev: `pnpm run dev` (web :5173 proxies `/api` to server :8080; env `PJSUITE_ADDR`, `PJSUITE_DB` default `pjsuite.db`)
- check: `pnpm run check` (oxfmt + oxlint + gofumpt + go vet); typecheck: `cd web && pnpm exec tsc --noEmit`
- test: `pnpm run test` (vitest in web, `go test` in server); single Go test: `cd server && go test ./internal/... -run Name`
- build: `pnpm run build`

## Layout

- `web/src/ui.tsx` shared Field/Choice/Badge/Banner/Blank/Loading/Avatar/FileRow/UploadBox/Timeline
- `web/src/catalog.ts` inventory of the 34 screens (ids, states, exclusions, next step)
- `web/src/globals.css` tokens/foundations, `product.css` component classes
- `web/src/components/ui/` vendored shadcn primitives (excluded from fmt/lint; do not restyle in place)
- `web/public/brand`, `web/public/tokens.json` brand assets and tokens
- `server/cmd/pjsuite` entrypoint; `server/internal/api` Echo routes under `/api`; `server/internal/store` SQLite open + goose migrate; `server/migrations` SQL
- `design/` DESIGN.md, SCREEN-SPECS.md, `prototype/` reference code (never import)

## Conventions

- UI: only tokens from `web/public/tokens.json`/`web/src/globals.css` and components from `web/src/components/ui` + `web/src/ui.tsx`; no ad-hoc colors, spacing, fonts. Reference: `design/DESIGN.md`, `design/SCREEN-SPECS.md`, `design/prototype/product.tsx`.
- Light mode only. Professional operates the app; client uses a link portal, no client account.
- Signed contract versions are immutable; edits create a new version. Internal tasks/notes never reach client views.
- SQLite only; single connection, WAL, foreign keys on. Schema changes: new goose SQL file in `server/migrations/` (embedded, auto-applied on start).

## Skills

- Editing .ts/.tsx: use `typescript` if available.
- Editing .go: use `go` if available.
- Writing code: use `lean-code` if available.
