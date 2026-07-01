---
status: pending
title: Timezone + Indexes — `withTimezone`, 4 indexes, `$onUpdate`
type: refactor
complexity: medium
dependencies:
  - task_01
---

# Task 03: Timezone + Indexes — `withTimezone`, 4 indexes, `$onUpdate`

## Overview

Switch all `timestamp('col')` calls in `db/schema.ts` to
`timestamp('col', { withTimezone: true })` to ensure timezone-aware
timestamp handling across the schema. Add 4 missing indexes for query
performance. Add `$onUpdate(() => new Date())` to `merchant_posts.updated_at`
for automatic update-timestamp management.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- All `timestamp('col')` MUST become `timestamp('col', { withTimezone: true })` across every table
- The `feed_events` materialized view definition in the migration SQL MUST remove `::timestamptz` casts — timestamps are now natively timestamptz
- `merchant_posts.updated_at` MUST add `$onUpdate(() => new Date())` for auto-updating on row modification
- 4 new indexes MUST be added:
  - `redemptions(user_id, status)` — for resident active-codes query
  - `verification(identifier)` — for Better Auth token validation
  - `transactions(redemption_id)` — for join performance
  - `file_metadata(user_id)` — for access control lookups
- Better Auth table timestamps MUST also get `withTimezone: true` (schema consistency)
</requirements>

## Subtasks

- [ ] 03.1 Add `withTimezone: true` to all timestamp columns in `user`, `businesses`, `coupons`, `redemptions`, `transactions`, `signals`
- [ ] 03.2 Add `withTimezone: true` to `merchant_posts.created_at`, `merchant_posts.updated_at`; add `$onUpdate(() => new Date())` to `updated_at`
- [ ] 03.3 Add `withTimezone: true` to `file_metadata.uploaded_at`
- [ ] 03.4 Add `withTimezone: true` to Better Auth table timestamps (`session`, `account`, `verification`)
- [ ] 03.5 Add index `idx_redemptions_user_id_status` on `redemptions(user_id, status)`
- [ ] 03.6 Add index `idx_verification_identifier` on `verification(identifier)`
- [ ] 03.7 Add index `idx_transactions_redemption_id` on `transactions(redemption_id)`
- [ ] 03.8 Add index `idx_file_metadata_user_id` on `file_metadata(user_id)`
- [ ] 03.9 Update `feed_events` MV definition — remove `::timestamptz` casts (redundant after withTimezone)
- [ ] 03.10 Run `deno task test` and fix any test failures

## Implementation Details

The `withTimezone: true` option changes the PostgreSQL column type from
`timestamp without time zone` to `timestamp with time zone`. This means
all timestamps are stored as UTC and converted to the session timezone
on retrieval.

The `$onUpdate` option is a Drizzle-level hook that sets the column value
to `new Date()` on every update. This only fires when using Drizzle's
typed `db.update()`, not raw SQL (`db.execute(sql`...`)`). After the query
layer conversion in Task 05 and Task 06, all updates go through typed
Drizzle, so `$onUpdate` covers all code paths.

The `::timestamptz` cast in the MV definition and in `lib/feed.ts` becomes
redundant because the source columns are already `timestamptz`. The MV
cast removal happens in the migration SQL (will be regenerated). The
feed.ts cast removal happens in Task 06.

Index naming convention follows existing patterns: `idx_<table>_<columns>`.

### Relevant Files
- `db/schema.ts` — All timestamp columns and index definitions
- `db/migrations/0000_high_franklin_storm.sql` — MV definition at line 169; `::timestamptz` casts will be removed in regenerated migration
- `lib/feed.ts` — Has `::timestamptz` casts in cursor-based pagination queries; removal handled in Task 06

### Dependent Files
- `db/migrations/` — Regenerated in Task 08 with updated $onUpdate and index definitions
- `seed.ts` — Timestamp values unchanged; compatible with timestamptz
- `tests/*.test.ts` — Test assertions on timestamp values may need adjustment if timezone behavior changes rendering

### Related ADRs
- ADR-001: Schema Reliability Standardization — scope and approach (F3: Timezone, F4: Indexes)
- ADR-002: Big Bang execution strategy (Layer 2: Structure)

## Deliverables

- All timestamp columns use `{ withTimezone: true }`
- 4 new indexes added to `db/schema.ts`
- `$onUpdate(() => new Date())` on `merchant_posts.updated_at`
- MV definition updated (no `::timestamptz` casts) — migration regenerated in Task 08
- All existing tests pass
- Unit tests with 80%+ coverage **(REQUIRED)**
- Integration tests for timezone and index behavior **(REQUIRED)**

## Tests

- Unit tests:
  - [ ] Schema compiles — all `timestamp()` calls include `withTimezone: true`
  - [ ] Index definitions compile without syntax errors
- Integration tests:
  - [ ] Insert a record with a specific UTC timestamp, read it back — timezone is preserved
  - [ ] `$onUpdate` on `merchant_posts` fires on `db.update()` — `updated_at` changes
  - [ ] An `EXPLAIN` on the resident active-codes query shows index scan on `idx_redemptions_user_id_status`
  - [ ] An `EXPLAIN` on the `transactions(redemption_id)` join shows index scan
- Test coverage target: >=80%
- All tests must pass

## Success Criteria

- All tests passing
- Test coverage >=80%
- Every `timestamp()` call has `{ withTimezone: true }`
- 4 new indexes exist in schema.ts definitions
- `merchant_posts.updated_at` has `$onUpdate`
