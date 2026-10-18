# PJ Suite
TypeScript, React 19, Vinext (Next-compatible on Vite) on Cloudflare Workers, Drizzle/D1 (optional), Tailwind 4 + Radix/shadcn. pt-BR UI. No test runner yet.

## Commands
- dev: `npm run dev` (port 5173; `-- --port N`)
- build: `npm run build`
- typecheck: `npx tsc --noEmit`
- lint: `npm run lint`
- migrations: `npm run db:generate`

## Layout
- `app/` routes and product code; `app/ui.tsx` shared Field/Choice/Badge/Banner/Blank/Loading/Avatar/FileRow/UploadBox/Timeline
- `app/catalog.ts` inventory of the 34 screens (ids, states, exclusions, next step)
- `app/globals.css` tokens/foundations, `app/product.css` component classes
- `components/ui/` shadcn primitives (vendored; do not restyle in place)
- `public/brand/`, `public/tokens.json` brand assets and engineering tokens
- `design/` DESIGN.md, SCREEN-SPECS.md, `prototype/` reference code (excluded from tsc/lint; never import)
- `build/`, `scripts/` Sites/Vinext build plumbing; `db/` Drizzle

## Conventions
- UI: only tokens from `public/tokens.json`/`app/globals.css` and components from `components/ui` + `app/ui.tsx`; no ad-hoc colors, spacing, fonts. Reference: `design/DESIGN.md`, `design/SCREEN-SPECS.md`, `design/prototype/product.tsx`.
- Light mode only. Professional operates the app; client uses a link portal, no client account.
- Signed contract versions are immutable; edits create a new version. Internal tasks/notes never reach client views.
- Dev auth is mocked (`app/chatgpt-auth.ts`); no real auth/signing/storage exists yet.

## Skills
- Editing .ts/.tsx: use `typescript` if available.
- Writing code: use `lean-code` if available.
