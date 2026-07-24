# Workflow Memory

Keep only durable, cross-task context here. Do not duplicate facts that are obvious from the repository, PRD documents, or git history.

## Current State

Tasks 01-09 done.

## Shared Learnings

- `deno fmt` breaks long `timestamp('col', { withTimezone: true }).notNull().defaultNow()` chains into multi-line format (`.notNull()` on next line). This is enforced by `deno task check`. Run `deno fmt` after schema edits.
- Pre-existing type error in `seed.ts:112` (string|undefined) exists since task_01 PK migration — not caused by task_03 changes.
- Test suite has 36 pre-existing failures (FK constraint violations from schema changes, leak detection, and connect-string host mismatch) — these are non-regression issues.
- `seed.ts` calls `Deno.exit(0)` at the end — cannot be imported directly in tests; use `Deno.Command` subprocess approach instead.
- `feedEvents` pgTable now available in schema.ts — typed Drizzle queries work against the MV
- `lib/test-db.ts` now exports `useDatabase()` and `cleanupDatabase()`. Key implementation details: `useDatabase()` monkey-patches Deno.test via `Object.defineProperty` (read-only TS decl but writable at runtime); `cleanupDatabase()` uses a single `TRUNCATE TABLE t1, t2, ...` statement (PostgreSQL requires all FK-referencing tables in one statement); `cleanupDatabase()` dynamically imports `db` from `lib/db.ts` to avoid module-level PG_CONNECTION throw.
- Running tests locally requires `PG_CONNECTION=postgresql://root:password@localhost:5432/pg` (Docker internal host `postgres` is unreachable from host).
- Container's `drizzle-kit generate` (v0.30.6) reports "No schema changes" against empty DB + empty journal. Use host `npx drizzle-kit generate` instead.
- Container's `drizzle-kit migrate` produces `text` PKs instead of `uuid`. Use host `npx drizzle-kit migrate` instead.
- `drizzle-kit generate` treats `pgTable` with MV-like name as regular table — must hand-edit SQL and snapshot for materialized views.
- Migration files must end with trailing newline for `deno fmt --check`.
- After migration generation, create `drizzle.__drizzle_migrations` tracking record so future `drizzle-kit migrate` calls recognize existing migrations.
- Test suite has 61 pre-existing failures (FK constraint violations, leak detection, UUID parsing, connect-string host mismatch) — no regressions from task_08 changes.
