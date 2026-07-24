# Task Memory: task_03.md

Keep only task-local execution context here. Do not duplicate facts that are obvious from the repository, task file, PRD documents, or git history.

## Objective Snapshot
Verified existing implementation of Admin Ledger API endpoints (`ledger.ts` and `toggle.ts`).

## Important Decisions
None needed, as the implementation and tests were already present.

## Learnings
The local tests required `PG_CONNECTION=postgresql://root:password@localhost:5432/pg` rather than using the default when executing outside the docker container. The test runner inside the docker container fails due to permissions in `/deno-dir/`.

## Files / Surfaces
- `routes/api/admin/businesses/[id]/ledger.ts`
- `routes/api/admin/businesses/[id]/toggle.ts`
- `tests/routes/api/admin/businesses/ledger_test.ts`
- `tests/routes/api/admin/businesses/toggle_test.ts`

## Errors / Corrections
Initial test run failed due to missing `PG_CONNECTION` and wrong password `postgres` instead of `root`. Fixed by setting explicit env var on host execution.

## Ready for Next Run
Task 03 complete.
