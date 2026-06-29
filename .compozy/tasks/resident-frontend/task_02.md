---
status: pending
title: 'Feed backend — lib/feed.ts + /api/feed endpoint'
type: backend
complexity: medium
dependencies:
  - task_01
---

# Task 02: Feed backend — lib/feed.ts + /api/feed endpoint

## Overview

Create the feed query logic in `lib/feed.ts` that queries the `feed_events` MV for global content and appends user-specific transaction savings, then expose it via `GET /api/feed`. This powers the resident home page feed with cursor-based pagination.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- MUST implement `queryFeed()` in `lib/feed.ts` that accepts `userId`, `cursor`, and `limit` parameters
- MUST query the `feed_events` MV for global content with cursor-based pagination on `created_at`
- MUST append user-specific savings notices from the `transactions` table when a userId is provided
- MUST merge global MV results and user-specific transaction results ordered by createdAt DESC
- MUST return a `FeedQueryResult` with `events` array and `cursor` string
- MUST expose the feed via `GET /api/feed?cursor=&limit=20` returning JSON
- MUST return 200 for unauthenticated users (global content only)
</requirements>

## Subtasks

- [ ] 02.1 Create `lib/feed.ts` with `FeedEvent` types and `queryFeed()` function
- [ ] 02.2 Implement MV query with cursor-based pagination
- [ ] 02.3 Implement user transaction query for savings notices
- [ ] 02.4 Implement in-memory merge by createdAt DESC
- [ ] 02.5 Create `routes/api/feed.ts` handler
- [ ] 02.6 Write unit and integration tests

## Implementation Details

See TechSpec "Core Interfaces" section for `FeedEvent`, `FeedQueryResult`, and `queryFeed()` signatures. See "API Endpoints" section for the feed endpoint contract.

The cursor is the unix-ms timestamp of the last event. Pagination fetches events with `created_at < cursor` (exclusive).

The user transaction query joins `transactions` with `businesses` to get the business name, and only includes recent transactions (last 90 days or configurable window).

For unauthenticated users (`userId=null`), skip the transaction query entirely.

### Relevant Files

- `lib/feed.ts` — New file: core feed logic
- `routes/api/feed.ts` — New file: feed API endpoint
- `lib/db.ts` — Drizzle client (imported by feed.ts)
- `lib/coupon.ts` — Redemption/Transaction types (for savings query)

### Dependent Files

- `routes/index.tsx` — Will fetch from this API (task_03)

### Related ADRs

- [ADR-005: Feed Data Model — Materialized View for Global Content with User-Specific Query](../adrs/adr-005.md) — Documents the MV + user query approach

## Deliverables

- `lib/feed.ts` with type definitions and `queryFeed()`
- `routes/api/feed.ts` with GET handler
- Unit tests for pagination, merge logic, and cursor encoding
- Integration tests for the API endpoint with seeded data
- Test coverage >=80%

## Tests

- Unit tests:
  - [ ] `queryFeed()` with empty MV returns empty events array and null cursor
  - [ ] `queryFeed()` with 25 seeded events returns page 1 (20 items) with non-null cursor
  - [ ] `queryFeed()` with cursor returns page 2 with remaining items
  - [ ] `queryFeed()` with invalid cursor returns page 1 (same as no cursor)
  - [ ] Transaction events are merged into the result in correct position by createdAt
  - [ ] Unauthenticated query (userId=null) does not include savings_notice events
- Integration tests:
  - [ ] `GET /api/feed` returns 200 with expected event types and correct ordering
  - [ ] `GET /api/feed?limit=5` returns exactly 5 events
  - [ ] `GET /api/feed` with no session returns 200 with global events only
- Test coverage target: >=80%
- All tests must pass

## Success Criteria

- All tests passing
- Test coverage >=80%
- Feed API returns correctly paginated, merged, and ordered results
