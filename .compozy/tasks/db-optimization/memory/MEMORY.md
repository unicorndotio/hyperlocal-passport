# Workflow Memory

Keep only durable, cross-task context here. Do not duplicate facts that are obvious from the repository, PRD documents, or git history.

## Current State

Task 03 (Timezone + Indexes) completed. Tasks 01-03 done. Remaining: 04-09.

## Shared Learnings

- `deno fmt` breaks long `timestamp('col', { withTimezone: true }).notNull().defaultNow()` chains into multi-line format (`.notNull()` on next line). This is enforced by `deno task check`. Run `deno fmt` after schema edits.
- Pre-existing type error in `seed.ts:112` (string|undefined) exists since task_01 PK migration — not caused by task_03 changes.
- Test suite has 27 pre-existing failures (PG_CONNECTION not set) and 1 pre-existing lint ignore — these are infrastructure issues, not regression.
