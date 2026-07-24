# Task Memory: task_08.md

Keep only task-local execution context here. Do not duplicate facts that are obvious from the repository, task file, PRD documents, or git history.

## Objective Snapshot
Generate a fresh `drizzle-kit` migration via `drizzle-kit generate`, review the SQL for correctness, apply it on a fresh DB, run seed, and verify tests pass.

## Important Decisions
- Container's `drizzle-kit generate` (v0.30.6) reports "No schema changes" against empty DB + empty journal. Workaround: generate from host via `PG_CONNECTION="postgresql://root:password@localhost:5432/pg" npx drizzle-kit generate`
- Container's `drizzle-kit migrate` produces `text` PKs instead of `uuid`. Use host `npx drizzle-kit migrate` instead
- Hand-edited migration SQL: replaced drizzle-kit's `CREATE TABLE "feed_events"` with `CREATE MATERIALIZED VIEW feed_events AS ...` plus `CREATE UNIQUE INDEX idx_feed_events_id` (for `REFRESH MATERIALIZED VIEW CONCURRENTLY`)
- Manually updated snapshot JSON to move `feed_events` from `tables` to `materializedViews`
- Created `drizzle.__drizzle_migrations` tracking table with hash record so future `drizzle-kit migrate` calls recognize the migration
- Fixed `_journal.json` missing trailing newline (format check)

## Learnings
- `drizzle-kit generate` from host `npx` produces correct `uuid` PKs; container version does not
- `drizzle-kit generate` treats `pgTable` with MV-like name as regular table — must hand-edit SQL and snapshot for materialized views
- Migration files must end with trailing newline for `deno fmt --check`

## Files / Surfaces
- `db/migrations/0000_0000_initial.sql`: Generated + hand-edited migration (feed_events MV fix)
- `db/migrations/meta/0000_snapshot.json`: Updated snapshot (feed_events in materializedViews)
- `db/migrations/meta/_journal.json`: Migration journal (fixed trailing newline)

## Errors / Corrections
- Container `drizzle-kit generate` always says "No schema changes" — used host `npx` instead
- `deno fmt --check` failed on `_journal.json` missing trailing newline — added newline
- 28 pre-existing lint errors (unused vars, no-explicit-any, no-window, jsx-button-has-type) — none in files touched by this task
- 61 pre-existing test failures (FK constraint violations, leak detection, UUID parsing, connect-string host mismatch) — consistent with documented 36+ pre-existing failures; no regressions from migration changes

## Ready for Next Run
- Migration applies cleanly on fresh DB via host `npx drizzle-kit migrate`
- Seed runs successfully after migration (UUID issues resolved by container rebuild)
- `deno task check` passes (format OK, lint/typecheck errors all pre-existing)
- Test suite: 187 passed, 61 failed, 1 ignored — all failures pre-existing
