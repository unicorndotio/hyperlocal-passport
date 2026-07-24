# Task Memory: task_05.md

Keep only task-local execution context here. Do not duplicate facts that are obvious from the repository, task file, PRD documents, or git history.

## Objective Snapshot

Convert `incrementViewCount()` in `lib/analytics.ts` from raw SQL to typed Drizzle `db.insert().onConflictDoUpdate()`. Keep `sql` import for increment expression. Add unit/integration tests.

## Important Decisions

- `sql` import stays — needed for `sql\`coupon_analytics.views + 1\`` inside `onConflictDoUpdate`
- `eq` import stays — used by `getCouponAnalytics`
- No schema changes needed — `couponAnalytics` already has `uuid` PK with `defaultRandom()`, `couponId` has `unique()` constraint (serves as ON CONFLICT target)

## Learnings

- `couponId` in schema has `.unique()` which is what enables ON CONFLICT targeting by `couponId`
- `seed.ts` already has a `onConflictDoNothing()` pattern for `couponAnalytics`

## Files / Surfaces

- `lib/analytics.ts` — modified: incrementViewCount body rewritten
- `tests/analytics.test.ts` — new file: unit + integration tests for incrementViewCount

## Errors / Corrections

## Ready for Next Run
