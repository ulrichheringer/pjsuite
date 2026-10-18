# PJ Suite
Monorepo. `web/`: React 19 SPA on Vite+ (`vite-plus`, local, npm), Tailwind 4, Radix/shadcn, react-router. `server/`: Go, Echo v5, SQLite (modernc, pure Go, no cgo). pt-BR UI.

## Commands
- web dev: `cd web && npm run dev` (5173, proxies `/api` to :8080)
- web check (fmt+lint): `cd web && npm run check`; typecheck: `cd web && npx tsc --noEmit`
- web test: `cd web && npm run test`; build: `cd web && npm run build`
- server run: `cd server && go run ./cmd/pjsuite` (env `PJSUITE_ADDR` default `:8080`, `PJSUITE_DB` default `pjsuite.db`)
- server vet/test: `cd server && go vet ./... && go test ./...`

## Layout
- `web/src/ui.tsx` shared Field/Choice/Badge/Banner/Blank/Loading/Avatar/FileRow/UploadBox/Timeline
- `web/src/catalog.ts` inventory of the 34 screens (ids, states, exclusions, next step)
- `web/src/globals.css` tokens/foundations, `product.css` component classes
- `web/src/components/ui/` vendored shadcn primitives (excluded from fmt/lint; do not restyle in place)
- `web/public/brand`, `web/public/tokens.json` brand assets and tokens
- `server/cmd/pjsuite` entrypoint; `server/internal/api` Echo routes under `/api`; `server/internal/store` SQLite open
- `design/` DESIGN.md, SCREEN-SPECS.md, `prototype/` reference code (never import)

## Conventions
- UI: only tokens from `web/public/tokens.json`/`web/src/globals.css` and components from `web/src/components/ui` + `web/src/ui.tsx`; no ad-hoc colors, spacing, fonts. Reference: `design/DESIGN.md`, `design/SCREEN-SPECS.md`, `design/prototype/product.tsx`.
- Light mode only. Professional operates the app; client uses a link portal, no client account.
- Signed contract versions are immutable; edits create a new version. Internal tasks/notes never reach client views.
- SQLite only; single connection, WAL, foreign keys on. No migration tool wired yet (add when first schema lands).

## Skills
- Editing .ts/.tsx: use `typescript` if available.
- Editing .go: use `go` if available.
- Writing code: use `lean-code` if available.
