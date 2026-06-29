---
status: completed
title: 'Database — merchant_posts table + feed_events materialized view'
type: backend
complexity: medium
dependencies: []
---

# Task 01: Database — merchant_posts table + feed_events materialized view

## Overview

Add the `merchant_posts` table to store merchant-authored feed content, and create the `feed_events` materialized view that unions global feed sources (merchant posts, coupon releases, admin announcements) into a single queryable source. This is the foundation for the hybrid feed feature.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- MUST add a `merchant_posts` table via Drizzle schema with fields: id (UUID PK), businessId (FK to businesses), title, body, imageUrl, isVisible (boolean, default false), createdAt, updatedAt
- MUST create a `feed_events` materialized view that unions merchant_posts (isVisible=true), coupons (isActive=true), and a placeholder for admin_announcements
- MUST include a unique index on the MV (required for CONCURRENTLY refresh)
- MUST generate a Drizzle migration and review it before applying
- MUST create a `refreshFeedView()` helper function in `lib/db.ts` or a new `lib/feed.ts`
</requirements>

## Subtasks

- [ ] 01.1 Add `merchant_posts` table definition to `db/schema.ts`
- [ ] 01.2 Define Drizzle relations for merchant_posts to businesses and users
- [ ] 01.3 Write the `feed_events` materialized view SQL in a migration file
- [ ] 01.4 Create `refreshFeedView()` helper that runs `REFRESH MATERIALIZED VIEW CONCURRENTLY feed_events`
- [ ] 01.5 Run `drizzle-kit generate`, review, and apply the migration
- [ ] 01.6 Write tests for the MV query and refresh helper

## Implementation Details

See TechSpec "Data Models" section for the `merchant_posts` table schema and "Materialized View" subsection for the MV SQL definition.

The MV uses `UNION ALL` with `ORDER BY created_at DESC`. A unique index on `feed_events(id)` is required for `CONCURRENTLY` refresh.

The `refreshFeedView()` helper should be a simple async function that takes the Drizzle instance and executes the raw SQL. It goes in `lib/feed.ts`.

### Relevant Files

- `db/schema.ts` — Add merchant_posts table and relations
- `drizzle.config.ts` — Existing Drizzle config (no changes needed)
- `lib/db.ts` — Existing Drizzle client; refreshFeedView can live here or in lib/feed.ts

### Dependent Files

- `lib/feed.ts` — Will depend on the MV existing (task_02)
- `routes/api/feed.ts` — Will query the MV (task_02)
- `routes/api/posts/index.ts` — Will insert into merchant_posts (task_05)

### Related ADRs

- [ADR-005: Feed Data Model — Materialized View for Global Content with User-Specific Query](../adrs/adr-005.md) — Documents the MV approach

## Deliverables

- `merchant_posts` table in Drizzle schema
- `feed_events` materialized view migration
- `refreshFeedView()` helper function
- Unit tests for `refreshFeedView()`
- Integration tests verifying MV content after inserts
- Test coverage >=80%

## Tests

- Unit tests:
  - [ ] `refreshFeedView()` executes without error against a test database
  - [ ] Calling `refreshFeedView()` twice is idempotent
- Integration tests:
  - [ ] Insert a merchant_post, refresh MV, query MV — row present with correct fields
  - [ ] Insert a coupon, refresh MV, query MV — row present with correct type discriminator
  - [ ] Set a merchant_post.isVisible=false, refresh MV, query MV — row excluded
  - [ ] Set a coupon.isActive=false, refresh MV, query MV — row excluded
  - [ ] MV includes correct discriminator (`merchant_post`, `coupon_released`) for each source type
- Test coverage target: >=80%
- All tests must pass

## Success Criteria

- All tests passing
- Test coverage >=80%
- `drizzle-kit generate` produces expected migration SQL
- Migration applies cleanly against a fresh `passport_test` database
