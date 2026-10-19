# PJ Suite

Contratos, entregas e acompanhamento para profissionais criativos (PJ), com portal por link para o cliente.

## Problem

Freelancers and small creative studios (e.g. a wedding photographer) run client work across chat, PDFs and spreadsheets: scope, price, change requests, signature and deliveries are scattered and unversioned. Disputes arise over what was agreed (which version, which start time) and what was delivered. Success: one place where the agreement is explicit and versioned, the client reviews/signs/approves via a link without creating an account, and the history of decisions and deliveries is recorded.

## Users

- Professional (PJ): the only account holder. Builds the project (scope, stages, deliverables, deadlines, price, payment plan), controls block visibility, generates the contract, shares the link, publishes deliveries, handles adjustments, closes the project.
- Client: no account. Opens a private link to review the proposal and contract, request changes, refuse, sign, follow progress, view deliveries, request adjustments, approve.
- Core loop: create client, build project, finalize contract version, share link, client changes/signs, execute, deliver, adjust, approve, conclude.

## MVP

The 34 screens in `web/src/catalog.ts` / `design/SCREEN-SPECS.md`, end to end with real persistence:

- Account: signup, login, profile.
- Clients and projects: create, edit, duplicate, archive; list by state.
- Agreement: builder, per-block visibility with client preview, contract generation, PDF via browser print, share link, revision (new version).
- Client portal: review, request change, refuse, sign (name, email, consent, receipt), progress, delivery, adjustment request, approval, shared history, invalid link page.
- Execution: stages/tasks, file uploads, delivery publish, adjustment cycle, completion, project history, professional notifications (in-app list).
- Rules: signed versions immutable; internal tasks/notes never reach client views; archive keeps history; duplicate drops signature/link/history.

## Out of scope

Social login, plans/billing, marketplace, templates marketplace, automated email/WhatsApp sending, push, chat, Gantt, DAM/gallery, native app, ICP-Brasil/certified signatures, legal advice, automatic progress percentage, analytics, dark mode, public profiles.

## Architecture

- Monorepo, pnpm workspaces `web` + `server`, tasks via `vp run` — one command for dev/check/test/build.
- Web: React 19 SPA on Vite+, TanStack Router (file-based), Tailwind 4 + Radix/shadcn, tokens from `web/public/tokens.json` — user-chosen stack; design system already delivered.
- Server: Go + Echo v5, JSON under `/api` — user-chosen; single static binary.
- DB: SQLite (modernc, no cgo), one connection, WAL, foreign keys, goose SQL migrations embedded and applied on start — simple ops, no external service.
- Queries: plain `database/sql` — user-approved, no codegen.
- Professional auth: email+password (hashed), server-side session cookie — simplest for a single-operator web app.
- Client access: unguessable random token per project link; server scopes responses to client-visible data only — no client account, isolation enforced in the API, not the UI.
- Contract versions: append-only rows; signing freezes a version — immutability is the core product rule.
- Files: Cloudflare R2 via its S3-compatible API, object key + metadata in DB, 20 MB limit, pdf/jpg/png/zip — matches the prototype's upload box; client downloads go through the API (token-checked, short-lived signed URLs), never public buckets.
- Contract PDF: browser print of an HTML contract sheet — no PDF engine needed.
- Dev: Vite proxies `/api` to :8080 — frontend HMR with the real API.
- Deploy: one VM running the Go binary (serves `web/dist` and `/api`) behind a TLS reverse proxy (Caddy), SQLite on the VM disk, files on R2 — one box, no orchestration; matches SQLite's single-writer model [INFERENCE: proxy choice is my default].

## Risks

- Client portal leaking internal tasks/notes — filter at the API with dedicated client DTOs; test that internal fields never serialize.
- Signature has no legal weight beyond a record (no ICP-Brasil) — record name, email, timestamp, IP, version hash; label clearly in UI; legal review before production.
- Link token guessable or leaked — 128-bit+ random token, revocable/regenerable, no project details on invalid link.
- Single SQLite connection limits write concurrency — fine for one professional per account at this scale; keep transactions short.
- SQLite file lives on the VM, unlike R2 files — scheduled backups (e.g. Litestream to R2) and disk snapshots before launch.
- `product.css` (2.4k lines) is prototype-specific — prune as real screens replace it.
- Design contract text is illustrative, not a legal template — needs real clause content before launch.

## Roadmap

- [x] Account: sessions migration, signup/login/logout/me endpoints, login + signup + profile screens, authenticated app shell
- [x] Clients: schema, CRUD + archive, clients board, create/edit/archive screens
- [x] Projects: schema, CRUD + duplicate + archive, projects list, create/edit screens
- [x] Builder structure: stages, tasks, deliverables, deadlines
- [x] Builder commercial: price, payment plan
- [x] Builder attachments: R2 upload behind a storage interface (in-memory fake in tests), 20 MB limit, pdf/jpg/png/zip
- [x] Visibility + contract: block visibility, client preview, contract version 1, PDF view
- [x] Share + client review: link token, portal review, request change, refuse, invalid link
- [ ] Revision + sign: new version flow, sign with receipt, immutability enforced
- [ ] Execution: tasks checklist, stage progress, file uploads to stages
- [ ] Delivery: publish delivery, client delivery view, token-checked downloads
- [ ] Adjustment + approval: adjustment cycle, approve, conclude
- [ ] History + notifications: events timeline (pro and client-shared), pro notifications list
- [ ] Production: single-binary serving of web build, CI, backups, hosting
