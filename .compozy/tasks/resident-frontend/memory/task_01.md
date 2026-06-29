# Task Memory: task_01.md

## Objective Snapshot
Completed: merchant_posts table schema + feed_events MV + refreshFeedView() helper + tests.

## Important Decisions
- Used `uuid` column type for merchant_posts.id (not `text` like existing tables) per TechSpec. This generates PostgreSQL-native UUID with `gen_random_uuid()` default.
- business_id in merchant_posts uses `uuid` type too, which requires `::text` cast in the MV's UNION ALL for compatibility with coupons.business_id (text type).
- MV uses `UNION ALL` with type discriminator, unique index on composite `id` for CONCURRENTLY support.
- `refreshFeedView()` placed in `lib/feed.ts` rather than `lib/db.ts` to keep DB connection concerns separate from feed concerns.

## Learnings
- Firewalling the `db as any` cast in tests triggered `no-explicit-any` lint rule. The `db` from `lib/db.ts` is already typed as `NodePgDatabase<typeof schema>` which matches the `Database` type in `lib/feed.ts`, so no cast is needed.
- Docker not available for migration apply; migration SQL is reviewed and ready but needs Docker/PostgreSQL to apply.
- Tests created with PG_CONNECTION guard — they run only when a database is available.

## Files / Surfaces
- `db/schema.ts`: Added merchant_posts table + relations
- `db/migrations/0001_gorgeous_shinobi_shaw.sql`: Generated migration + manual MV SQL
- `lib/feed.ts`: New file with refreshFeedView() and type exports
- `tests/feed.test.ts`: Unit + integration tests for MV and refresh helper

## Errors / Corrections
- Initial test had `as any` casts and unused imports — fixed to pass lint.
- The `as any` was unnecessary because the `db` from `lib/db.ts` already has the correct type.

## Ready for Next Run
Task complete. Migration needs to be applied against Docker PostgreSQL before integration tests can execute.
