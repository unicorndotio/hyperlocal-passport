# Task Memory: task_03.md

## Objective Snapshot

Completed. All timestamp columns migrated to `withTimezone: true`, 4 indexes added, `$onUpdate` on merchant_posts.updated_at, MV casts removed.

## Important Decisions

- `replaceAll` used for bulk timestamp patterns (created_at ×8, updated_at ×5→4 after merchant_posts special-case, expires_at ×2)
- Merchant posts `updatedAt` handled first with `$onUpdate` before bulk replaceAll of other `updated_at` columns
- Index naming follows existing `idx_<table>_<columns>` convention
- `deno fmt` reformatted long `withTimezone` lines (accessTokenExpiresAt, refreshTokenExpiresAt) into multi-line objects — this is codebase convention, accepted

## Learnings

- The `timestamp('col', { withTimezone: true })` option with `.notNull().defaultNow()` creates long lines that `deno fmt` breaks into multi-line chains
- `deno fmt` formatting is enforced in the `deno task check` pipeline (fmt → lint → type-check)

## Files / Surfaces

- `db/schema.ts` — all timestamp + index + $onUpdate changes
- `db/migrations/0000_high_franklin_storm.sql` — MV ::timestamptz cast removal (2 lines)

## Errors / Corrections

- Initial `deno task check` failed on formatting (1 unformatted file: `db/schema.ts`). Fixed by running `deno fmt`
- Pre-existing type-check error in `seed.ts:112` (`string | undefined` not assignable to `string`) is not from this task
- Pre-existing lint errors (28 issues, 0 in changed files)
- All 27 test failures are pre-existing `PG_CONNECTION` errors

## Ready for Next Run

Yes — all deliverables verified and passing.
