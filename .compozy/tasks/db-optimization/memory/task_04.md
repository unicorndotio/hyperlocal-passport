# Task Memory: task_04.md

Keep only task-local execution context here. Do not duplicate facts that are obvious from the repository, task file, PRD documents, or git history.

## Objective Snapshot

Replace all hardcoded string IDs in seed.ts with crypto.randomUUID() while preserving FK references. Completed.

## Important Decisions

- Used Option B from techspec: explicit `crypto.randomUUID()` stored in local variables for FK-dependent entities (businesses, coupons, redemptions). Used inline `crypto.randomUUID()` for entities with no downstream references (merchant posts, transactions, coupon analytics).
- Merchant post IDs use inline `crypto.randomUUID()` since no other entity references merchant_posts by ID.
- Transaction IDs use inline `crypto.randomUUID()` since they won't be referenced further (audit trail is terminal).
- Removed `return values.id` from `upsertCoupon` and changed return type to `Promise<void>`.
- Tests run seed.ts as a subprocess via `Deno.Command` to avoid `Deno.exit(0)` in seed.ts killing the test runner.
- Used raw SQL for feed_events MV count test since `feedEvents` pgTable mapping isn't added until task_06.

## Learnings

- `seed.ts` uses `Deno.exit(0)` at the end — cannot be directly imported in tests without killing the process.
- `db.execute(sql\`...\`)` returns `{ rows: [...] }` in Deno Postgres.js driver (not a typed array).
- The `feedEvents` pgTable mapping is not yet in schema.ts (task_06).

## Files / Surfaces

- `seed.ts` — all hardcoded IDs replaced, `upsertCoupon` return type changed
- `tests/seed.test.ts` — new file with unit + integration tests

## Errors / Corrections

- Initial test file tried importing seed.ts directly, which would cause `Deno.exit(0)` to kill the test runner. Fixed by using `Deno.Command` subprocess approach.

## Ready for Next Run

No blocking issues. Pre-existing lint errors in other files are unrelated.
