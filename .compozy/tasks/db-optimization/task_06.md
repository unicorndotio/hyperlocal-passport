---
status: pending
title: Feed query + MV — `feedEvents` pgTable + typed Drizzle in `queryFeed`
type: backend
complexity: medium
dependencies:
  - task_02
  - task_03
---

# Task 06: Feed query + MV — `feedEvents` pgTable + typed Drizzle in `queryFeed`

## Overview

Add a read-only `pgTable` mapping for the `feed_events` materialized view to
`db/schema.ts`, enabling typed Drizzle queries against the MV. Convert the
`queryFeed()` function in `lib/feed.ts` from mixed raw SQL to fully typed
Drizzle, removing `::timestamptz` casts and manual row mapping. The
`refreshFeedView()` function stays raw SQL (MV refresh is DDL).

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- A read-only `feedEvents` pgTable MUST be added to `db/schema.ts` with columns matching the MV definition
- The `queryFeed()` function MUST use typed Drizzle for both the MV query and the transaction query
- The `::timestamptz` casts in `queryFeed()` MUST be removed (redundant after Task 03)
- The manual row mapping (`String(row.id)`, `new Date(row.created_at)`) in `queryFeed()` MUST be removed — typed queries return typed results
- The `FeedEvent` interface, `FeedQueryResult`, and `refreshFeedView()` MUST remain unchanged
- The cursor-based pagination logic (cursor → Date parsing, merge-sort) MUST remain unchanged
- The function signature `queryFeed(db, userId?, cursor?, limit?)` MUST NOT change
</requirements>

## Subtasks

- [ ] 06.1 Add `feedEvents` pgTable definition to `db/schema.ts` — read-only mapping, no insert/update
- [ ] 06.2 Export `feedEvents` from `db/schema.ts` so `lib/feed.ts` can import it
- [ ] 06.3 Convert MV query (`SELECT * FROM feed_events`) to typed `db.select().from(feedEvents)` with `.where()`, `.orderBy()`, `.limit()`
- [ ] 06.4 Convert transaction query to typed `db.select().from(transactions).innerJoin(businesses)` with typed columns
- [ ] 06.5 Remove `::timestamptz` casts and manual row mapping (`String(row.id)`, etc.)
- [ ] 06.6 Run `deno task test` — focus on `tests/feed.test.ts` and related tests

## Implementation Details

The `feedEvents` pgTable maps the MV defined in migration SQL:

```ts
export const feedEvents = pgTable('feed_events', {
  id: text('id').primaryKey(),
  type: text('type').notNull(),
  title: text('title').notNull(),
  description: text('description'),
  imageUrl: text('image_url'),
  businessId: text('business_id'),
  businessName: text('business_name'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
})
```

This definition is purely for the query builder — it does not create the MV
and will never be used for insert/update/delete.

The MV query conversion:
```ts
// Before:
let mvSql = sql`SELECT * FROM feed_events`
if (cursorDate) {
  mvSql = sql`${mvSql} WHERE created_at < ${cursorDate}::timestamptz`
}
mvSql = sql`${mvSql} ORDER BY created_at DESC LIMIT ${pageSize}`
const mvResult = await db.execute(mvSql)

// After:
const mvQuery = db.select().from(feedEvents)
if (cursorDate) {
  mvQuery.where(lt(feedEvents.createdAt, cursorDate))
}
const mvRows = await mvQuery
  .orderBy(desc(feedEvents.createdAt))
  .limit(pageSize)
```

The typed rows from `mvRows` have typed column access (`mvRows[0].title` is
`string`, `mvRows[0].createdAt` is `Date`) — no need for `String(row.title)`
or `new Date(row.created_at)`.

### Relevant Files
- `db/schema.ts` — Add `feedEvents` pgTable at the end of table definitions (before relations)
- `lib/feed.ts` — `queryFeed()` function (lines 44-126); convert MV and transaction queries
- `lib/db.ts` — Pool singleton, schema import, used by feed.ts via `Database` type

### Dependent Files
- `tests/feed.test.ts` — Tests the feed query; should pass without changes if output shape is identical
- `seed.ts` — Calls `REFRESH MATERIALIZED VIEW` — unchanged

### Related ADRs
- ADR-001: Schema Reliability Standardization — scope and approach (F6: Query layer standardization)
- ADR-003: pgTable mapping for feed_events materialized view

## Deliverables

- `feedEvents` pgTable in `db/schema.ts` (read-only, typed queries)
- `lib/feed.ts` `queryFeed()` fully typed Drizzle — no raw SQL, no ::timestamptz
- All existing tests pass
- Unit tests with 80%+ coverage **(REQUIRED)**
- Integration tests for feed query behavior **(REQUIRED)**

## Tests

- Unit tests:
  - [ ] `feedEvents` pgTable definition compiles and exports correctly
  - [ ] Typed MV query returns rows matching `FeedEvent` type shape
  - [ ] Typed transaction query returns rows matching expected shape
- Integration tests:
  - [ ] `queryFeed()` without cursor returns first page of events, mixed types (merchant_post + coupon_released + savings_notice)
  - [ ] `queryFeed()` with cursor returns next page
  - [ ] `queryFeed()` for authenticated user includes savings_notice events
  - [ ] `queryFeed()` for unauthenticated user (null userId) returns only MV events
  - [ ] Output `FeedEvent` shape matches pre-conversion (same fields, same types)
  - [ ] Cursor-based pagination produces correct next cursor
- Test coverage target: >=80%
- All tests must pass

## Success Criteria

- All tests passing
- Test coverage >=80%
- `lib/feed.ts` has no `db.execute(sql\`...\`)` calls except `refreshFeedView`
- MV query produces identical results to pre-conversion
- Transaction query produces identical results to pre-conversion
