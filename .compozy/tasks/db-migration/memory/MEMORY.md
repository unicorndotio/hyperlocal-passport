# Workflow Memory

## Current State

**All tasks complete.** Task 14 (Cleanup & Final Configuration) is finished.

Key outcomes:
- `lib/kv.ts` and `lib/kv-adapter.ts` deleted — zero remaining imports in source code
- `--unstable-kv` flag removed from `deno.json`, `Dockerfile`, `docker-compose.yml`
- `deno.unstable` removed from `compilerOptions.lib` in `deno.json`
- `tests/kv_adapter_indexes.test.ts` deleted
- `passport_data` volume removed from `docker-compose.yml`
- `cov.txt` and `.github/copilot-instructions.md` updated to remove KV references
- Zero KV references in source code (`grep -r "Deno.openKv" lib/ routes/ islands/ tests/` returns 0)
- 86 pure unit/UI tests pass; 24 integration tests require `PG_CONNECTION` (expected — pre-existing)

- `lib/auth.ts` drizzleAdapter schema must use table references (`schema.users`) not strings (`'user'`). String mapping causes `auth.api.signUpEmail()` to fail with "field email does not exist in the schema".

## Shared Decisions

- PostgreSQL volume mount at `/var/lib/postgresql` (parent directory) required for postgres:18-alpine; the image creates a major-version subdirectory internally. Mounting directly to `/var/lib/postgresql/data` causes startup failure.
- Connection string format: `postgresql://root:password@postgres:5432/pg`
- Standalone `index().on(column)` syntax triggers runtime crash in drizzle-kit TS loader. Use inline table function syntax `pgTable('t', {...}, (t) => ({ idx: index().on(t.col) }))` instead.
- drizzle-kit requires `pg` (or compatible) driver installed in the same Node.js project for `migrate` to work.
- Better Auth schema table names must match exactly: `user`, `session`, `account`, `verification`. Config uses explicit schema mapping in `drizzleAdapter(db, { provider: 'pg', schema: {...} })`.

## Shared Learnings

- Deno 2.7.7 detects pg.Pool TCP connections as leaks — all DB-backed `Deno.test` blocks need `sanitizeOps: false, sanitizeResources: false` in options object.
- Business CNPJ in tests must use random/unique values (`Date.now().toString(36) + Math.random().toString(36)`) to avoid unique constraint collisions across tests.
- FK cleanup must delete child rows first (redemptions → analytics → coupons).
- `db.delete().where(eq(...))` with CASCADE foreign keys (onDelete: cascade) handles child row cleanup automatically — no manual ordering needed when schema defines cascading deletes.

- `postgres:18-alpine` refuses to start if the volume mount targets `/var/lib/postgresql/data` directly; use `/var/lib/postgresql` instead.
- Better Auth Drizzle adapter uses official `better-auth/adapters/drizzle` module. Type-safe additionalFields work identically with Drizzle.
- RBAC middleware unchanged — uses public API `auth.api.getSession()` which returns session and user with role/status fields.
- File metadata now in PostgreSQL fileMetadata table: id (UUID), filename (unique), userId (nullable), isPublic (boolean), uploadedAt (timestamp).
- When migrating from KV to Drizzle, ensure imported schema exports match database operations (e.g., fileMetadata table export must be available in schema.ts).
- Signal routes: `handleCreateSignal(body, residentId)` no longer takes `kvInstance`. Uses `db` directly. API response returns `status` field (pending/approved/rejected) instead of `reviewed` boolean.

## Open Risks

- 24 integration tests fail with `PG_CONNECTION environment variable is not set` when PostgreSQL is not running. Running `docker compose up -d postgres` before testing resolves this.

## Handoffs

- Task 06 (User Registration & Approval Routes) — assumes auth and file metadata on Drizzle; expects schema and db singleton in place.
- Tasks 07–09 completed. Task 10 (Signals Routes & Rate Limit Removal) complete — signal routes now use Drizzle; rate limiting removed per ADR-007.
- Task 11 (Admin Routes Migration) complete.
- Task 12 (User Redemptions & Upload Routes) complete — `routes/api/users/me/redemptions.ts` migrated from KV prefix scan to Drizzle query; `routes/api/uploads/[filename].ts` already migrated in task_05.
- Task 13 (Seed Script) — complete. seed.ts uses `db.insert().onConflictDoNothing()` for idempotent Drizzle inserts. Admin created via Better Auth, role/status set via Drizzle update. Sample businesses/coupons inserted. No KV imports. Run without `--unstable-kv`.
- Task 14 (Cleanup) — complete. `lib/kv.ts` and `lib/kv-adapter.ts` deleted. All config files cleaned. Zero KV references in source code. `deno.unstable` removed from compilerOptions.
