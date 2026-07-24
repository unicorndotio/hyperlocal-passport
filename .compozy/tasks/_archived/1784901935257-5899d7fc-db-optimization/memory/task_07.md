# Task Memory: task_07.md

## Objective Snapshot

Create `lib/test-db.ts` with `useDatabase()` (PG_CONNECTION guard + sanitize flags) and `cleanupDatabase()` (TRUNCATE all app tables). Created unit tests. Migrated `savings_api.test.ts` as proof-of-pattern.

## Important Decisions

- Used `Object.defineProperty(Deno, 'test', ...)` instead of direct assignment because `Deno.test` is read-only in TS declarations.
- Single `TRUNCATE TABLE t1, t2, ...` statement instead of per-table calls — PostgreSQL requires all FK-referencing tables in the same statement.
- Dynamic `import('./db.ts')` inside `cleanupDatabase()` to avoid module-level throw when PG_CONNECTION is not set.
- Added `// deno-lint-ignore react-rules-of-hooks` for `useDatabase()` calls — utility is named like a React hook but is a test helper.

## Learnings

- `Deno.test` is declared read-only in Deno's TS types but is writable at runtime; `Object.defineProperty` works.
- PostgreSQL TRUNCATE requires all FK-referencing tables in the same statement, not individually.
- The schema import from `../db/schema.ts` is not needed when using raw SQL for TRUNCATE.

## Files / Surfaces

- Created: `lib/test-db.ts` — useDatabase() + cleanupDatabase()
- Created: `tests/test_db.test.ts` — unit tests (4 tests, all passing)
- Modified: `tests/savings_api.test.ts` — migrated as proof-of-pattern

## Errors / Corrections

- First attempt used individual TRUNCATE statements → FK constraint violation error. Fixed by using a single TRUNCATE with all tables.
- First import of `db` at module level caused test file to fail when PG_CONNECTION not set. Fixed by using dynamic import inside cleanupDatabase().

## Ready for Next Run

All 9 tests pass (4 test-db + 5 savings_api). Lint and type-check clean. Pre-existing 36 test failures unchanged (not caused by this task).
