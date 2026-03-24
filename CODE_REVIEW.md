# Code Review Findings (2026-03-24)

## Scope
Reviewed server and serverless API code for correctness/runtime issues in:
- `server/`
- `api/`
- `shared/`

## High-severity issues

1. **Build-breaking syntax errors in core backend modules**
   - `server/lib/supabase.js` contains duplicated/fragmented JSDoc and duplicate function declarations (`insertDebate`, `saveDebateToSupabase`) that break parsing.
   - `server/routes/personas.js` contains duplicated route handlers and malformed template-string content in code position.
   - `api/generate-personas.js` has an unbalanced `for`/`try` block and references `personas` out of scope.

   **Impact:** backend cannot start reliably and persona-generation endpoints fail to deploy/execute.

2. **Rate limiter is mounted after route handlers**
   - `server/index.js` mounts `/api` routers before mounting `/api/generate-personas` limiter middleware.

   **Impact:** requests are already handled by the route before limiter runs, so the abuse protection is effectively bypassed.

## Medium-severity issues

3. **Hard-coded machine-specific vault discovery path**
   - `server/lib/vaultWriter.js` scans a fixed Windows path (`C:/Users/ngmat/OneDrive/Desktop`) when `VAULT_ROOT` is unset.

   **Impact:** brittle across environments (Linux/macOS/CI/containers), causing storage failures in local/dev setups that do not match that path.

4. **Persona count mismatch bug in serverless persona endpoint**
   - `api/generate-personas.js` computes `personaCount` from input, but validation still requires exactly `5` personas.

   **Impact:** valid requests for 3-7 personas will fail incorrectly.

## Suggested remediation order
1. Fix parse/syntax errors in `server/lib/supabase.js`, `server/routes/personas.js`, and `api/generate-personas.js`.
2. Move the `/api/generate-personas` limiter middleware so it executes **before** route handlers (or mount it directly on the route before router mount).
3. Replace hard-coded vault fallback path with OS-aware discovery or require explicit `VAULT_ROOT`.
4. Align all persona-count validation with normalized `personaCount`.

## Checks run
- `npm test` (failed: `vitest` not installed because dependency install was blocked by registry 403)
- `npm install` (failed: 403 fetching packages)
- `node --check server/lib/supabase.js` (failed)
- `node --check server/routes/personas.js` (failed)
- `node --check api/generate-personas.js` (failed)
