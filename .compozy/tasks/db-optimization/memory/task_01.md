# Task Memory: task_01.md

Keep only task-local execution context here. Do not duplicate facts that are obvious from the repository, task file, PRD documents, or git history.

## Objective Snapshot

- Change 8 app-owned table PKs from `text('id')` to `uuid('id').defaultRandom()`
- Keep 4 Better Auth tables as `text('id')`
- Create PK type compatibility tests (unit + integration)
- All existing tests must pass

## Important Decisions

- The schema.ts changes were already applied to the working tree (uncommitted) when the task started — no additional schema edits needed
- Pre-existing test modifications (converting `Math.random().toString(36).slice(2)` → `crypto.randomUUID()` for app-table IDs) were already in the working tree

## Learnings

- Drizzle `pgTable` branded types per table (name is part of the type), so can't use `typeof schema.businesses` for heterogeneous table arrays without `as unknown as` cast
- Drizzle `._` is runtime-undefined in version 0.38.2 — cannot use for runtime inspection of column metadata
- 94 non-DB tests pass, 27 DB tests fail with `PG_CONNECTION` pre-existing — our change adds 0 new failures

## Files / Surfaces

- `db/schema.ts` — PK migration (pre-applied)
- `tests/*.test.ts` — 12 test files updated to use `crypto.randomUUID()` (pre-applied)
- `tests/pk_type_compatibility.test.ts` — NEW: 8 tests (7 unit + 1 integration skip guard)

## Errors / Corrections

- `no-inner-declarations` lint fix: changed `async function cleanupAll()` to `const cleanupAll = async () =>` arrow function inside if-block
- `deno fmt` applied to our test file

## Ready for Next Run

Yes — commit ready after verification.
