# Release Notes — Integration Rebase (2026-03-24)

## Feature: Integration branch parity and merge-order rebase
- Repository currently has a single local branch (`work`) and no tracked feature branches to rebase.
- Merge-order verification was performed from commit graph; no additional rebase actions were required in this clone.

## Feature: Frontend route and share-link hardening
- Added route-awareness in `App.jsx` for `/` and `/debate/:id` path patterns.
- Switched save API target from `/api/save-to-obsidian` to `/api/save-to-database`.
- Added guarded share-link copy flow: link generation/copy only occurs when a DB-backed `debateId` is available.

## Feature: API endpoint parity (Vercel + Express)
- Added Express mirror endpoint `POST /api/save-to-database` via `server/routes/storage.js`.
- Mounted new storage route in `server/index.js` so local Express and Vercel serverless behavior align.

## Feature: `persona_count` migration + backend alignment
- Added `persona_count INT NOT NULL DEFAULT 5` to `supabase/schema.sql` debates table.
- Updated Supabase insert path to write `persona_count` using `personas.length` fallback to 5.
- Updated list/search query projections to include `persona_count`.

## Static QA checklist (planning phase, no runtime execution)
1. Route-level flow sanity (`/` vs `/debate/:id`)
   - `App.jsx` now detects `/debate/:id` and hydrates `currentDebateId`; `handleNewDebate` returns route to `/`.
2. API endpoint parity (Vercel + Express mirrors)
   - Vercel: `api/save-to-database.js`
   - Express mirror: `server/routes/storage.js` mounted in `server/index.js`
3. Save path correctness (`/api/save-to-database`)
   - Frontend save call now points to `/api/save-to-database`.
4. Share-link generation guard when `debateId` unavailable
   - `handleShareLink` explicitly guards and reports status when `debateId/shareUrl` is absent.
5. Migration + backend insert alignment for `persona_count`
   - Schema and `insertDebate`/`saveDebateToSupabase` now aligned.

## Known follow-ups
- Add full debate hydration for direct `/debate/:id` loads (currently only ID selection state is set).
- Persist sidebar debate list updates back to localStorage after new saves.
- Add route integration tests and endpoint contract tests for parity.
- Resolve local package-manager lock inconsistency so `vitest` can run reliably in CI/dev.
