---
status: pending
title: PK type migration — 8 app tables `text` to `uuid`
type: refactor
complexity: high
dependencies: []
---

# Task 01: PK type migration — 8 app tables `text` to `uuid`

## Overview

Switch primary keys on all 8 app-owned tables from `text('id')` to
`uuid('id').defaultRandom()` to establish a consistent PK convention and
leverage native PostgreSQL UUID generation. The 4 Better Auth tables
(`user`, `session`, `account`, `verification`) keep `text` PKs since
their schema is managed by the Better Auth adapter. `merchant_posts`
currently uses `$defaultFn(() => crypto.randomUUID())` — this is replaced
with the standard `uuid('id').defaultRandom()`.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- App-owned tables MUST use `uuid('id').defaultRandom()` instead of `text('id')`
- Affected tables: `businesses`, `coupons`, `redemptions`, `transactions`, `signals`, `coupon_analytics`, `merchant_posts`, `file_metadata`
- `merchant_posts.id` MUST remove `$defaultFn(() => crypto.randomUUID())` in favor of `uuid('id').defaultRandom()`
- Better Auth tables MUST remain `text('id')`: `user`, `session`, `account`, `verification`
- The import of `uuid` from `drizzle-orm/pg-core` MUST be added to `db/schema.ts`
- Existing tests MUST continue to pass after the change — test files may need minor updates to match new PK type expectations
</requirements>

## Subtasks

- [ ] 01.1 Add `uuid` import from `drizzle-orm/pg-core` to `db/schema.ts`
- [ ] 01.2 Change `businesses.id` from `text('id')` to `uuid('id').defaultRandom()`
- [ ] 01.3 Change `coupons.id` from `text('id')` to `uuid('id').defaultRandom()`
- [ ] 01.4 Change `redemptions.id` from `text('id')` to `uuid('id').defaultRandom()`
- [ ] 01.5 Change `transactions.id` from `text('id')` to `uuid('id').defaultRandom()`
- [ ] 01.6 Change `signals.id`, `coupon_analytics.id`, `file_metadata.id` to `uuid('id').defaultRandom()`
- [ ] 01.7 Change `merchant_posts.id` — replace `$defaultFn(() => crypto.randomUUID())` with `uuid('id').defaultRandom()`
- [ ] 01.8 Run `deno task test` and fix any test failures caused by PK type changes

## Implementation Details

The change is entirely within `db/schema.ts`. Each app-owned table definition
needs its `id` column changed from `text('id').primaryKey()` to
`uuid('id').primaryKey().defaultRandom()`. The `uuid` function must be
imported from `drizzle-orm/pg-core` alongside the existing imports.

The `$defaultFn` on `merchant_posts.id` must be removed — `defaultRandom()`
handles UUID generation at the database level, which is consistent with all
other app tables.

Drizzle's `defaultRandom()` generates a UUID v4 via PostgreSQL's
`gen_random_uuid()`. When inserting via Drizzle, omitting the `id` field
triggers the default. Tests that currently pass explicit string IDs for
app-owned tables will need their ID generation to match — existing tests
use `crypto.randomUUID()` for merchant_posts and pattern-based strings
like `'sav_user_' + Math.random().toString(36).slice(2)` for other tables.
After the change, tests can either use `crypto.randomUUID()` universally
or omit `id` (preferred for new test data, but explicit IDs keep FK
references deterministic within test scope).

### Relevant Files
- `db/schema.ts` — All 11 table definitions live here; the 8 app tables need PK changes
- `db/migrations/` — Current migration snapshot reflects `text` PKs; will be regenerated in Task 08

### Dependent Files
- `seed.ts` — Uses hardcoded string IDs; will be realigned in Task 04
- `tests/*.test.ts` — Many tests construct IDs like `'sav_user_' + random()` for insert and lookup; affected by PK shape change
- `lib/analytics.ts` — References `crypto.randomUUID()` for analytics IDs; compatible with new uuid PKs
- `lib/feed.ts` — References IDs from feed_events MV; compatible with uuid PKs

### Related ADRs
- ADR-001: Schema Reliability Standardization — scope and approach (F1: PK type migration)
- ADR-002: Big Bang execution strategy (Layer 1: Foundation)

## Deliverables

- `db/schema.ts` updated — all 8 app tables use `uuid('id').defaultRandom()`
- `uuid` import added to schema.ts
- `merchant_posts.id` no longer uses `$defaultFn`
- All existing tests pass after the change
- Unit tests with 80%+ coverage **(REQUIRED)**
- Integration tests for PK type compatibility **(REQUIRED)**

## Tests

- Unit tests:
  - [ ] Drizzle query builder can reference new `uuid` PK columns without type errors
  - [ ] `db.insert(table).values({ ... }).returning({ id: table.id })` returns a UUID string
- Integration tests:
  - [ ] Insert a record on each app-owned table without specifying `id` — verifies `defaultRandom()` fires
  - [ ] Insert a record with an explicit `crypto.randomUUID()` `id` — verifies explicit IDs still work
  - [ ] Join across app-owned tables using FK references works with uuid PKs
  - [ ] Join from app-owned table to Better Auth `user` table (text PK) works across types
- Test coverage target: >=80%
- All tests must pass

## Success Criteria

- All existing tests passing
- Test coverage >=80%
- `uuid` import present in `db/schema.ts`
- 8 app tables using `uuid('id').defaultRandom()`
- 4 Better Auth tables unchanged (`text('id')`)
- `merchant_posts.id` uses `defaultRandom()` not `$defaultFn`
