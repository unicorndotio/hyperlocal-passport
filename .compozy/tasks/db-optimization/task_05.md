---
status: pending
title: Analytics query — typed Drizzle UPSERT for `incrementViewCount`
type: refactor
complexity: low
dependencies:
  - task_02
  - task_03
---

# Task 05: Analytics query — typed Drizzle UPSERT for `incrementViewCount`

## Overview

Convert the raw SQL UPSERT in `lib/analytics.ts:incrementViewCount()` to
Drizzle's typed `onConflictDoUpdate()` API. The `getCouponAnalytics()`
function already uses typed Drizzle and requires no changes.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- `incrementViewCount()` MUST use `db.insert().onConflictDoUpdate()` instead of `db.execute(sql\`...\`)`
- The typed Drizzle MUST use `sql\`coupon_analytics.views + 1\`` for the increment expression inside `onConflictDoUpdate`
- `getCouponAnalytics()` MUST remain unchanged (already typed Drizzle)
- The raw SQL import (`sql` from `drizzle-orm`) MUST remain in the file — it is still needed for the increment expression inside `onConflictDoUpdate`
- The function signature MUST NOT change: `export async function incrementViewCount(couponId: string): Promise<void>`
</requirements>

## Subtasks

- [ ] 05.1 Rewrite `incrementViewCount` body — replace `db.execute(sql\`INSERT INTO coupon_analytics...\`)` with `db.insert(schema.couponAnalytics).values({...}).onConflictDoUpdate({...})`
- [ ] 05.2 Remove unnecessary imports if any become unused — verify `sql` is still needed for the increment expression
- [ ] 05.3 Run `deno task test` — focus on `tests/analytics_api.test.ts` and any tests exercising `incrementViewCount`
- [ ] 05.4 Verify the rewrite produces the same SQL behavior (view count increments correctly)

## Implementation Details

The conversion follows this pattern (see TechSpec "Core Interfaces" section):

```ts
// Before:
await db.execute(
  sql`INSERT INTO coupon_analytics (id, coupon_id, views)
      VALUES (${analyticsId}, ${couponId}, 1)
      ON CONFLICT (coupon_id)
      DO UPDATE SET views = coupon_analytics.views + 1`,
)

// After:
await db.insert(schema.couponAnalytics)
  .values({ id: crypto.randomUUID(), couponId, views: 1 })
  .onConflictDoUpdate({
    target: schema.couponAnalytics.couponId,
    set: { views: sql`coupon_analytics.views + 1` },
  })
```

The `sql` import is still needed for the `sql\`coupon_analytics.views + 1\``
expression. The `crypto.randomUUID()` call for the analytics ID remains.

### Relevant Files
- `lib/analytics.ts` — `incrementViewCount` (line 14-21) is the only function to change

### Dependent Files
- `tests/analytics_api.test.ts` — Tests that exercise `incrementViewCount`; should pass without changes

### Related ADRs
- ADR-001: Schema Reliability Standardization — scope and approach (F6: Query layer standardization)

## Deliverables

- `lib/analytics.ts` updated — `incrementViewCount` uses typed Drizzle
- All existing tests pass
- Unit tests with 80%+ coverage **(REQUIRED)**
- Integration tests for analytics behavior **(REQUIRED)**

## Tests

- Unit tests:
  - [ ] `incrementViewCount` inserts a new row when no analytics record exists for the couponId
  - [ ] `incrementViewCount` increments views when a record already exists (call twice → views = 2)
- Integration tests:
  - [ ] Full flow: create coupon → increment view count → `getCouponAnalytics` returns correct count
  - [ ] Concurrent increments (two parallel calls) produce the correct final count
- Test coverage target: >=80%
- All tests must pass

## Success Criteria

- All tests passing
- Test coverage >=80%
- `lib/analytics.ts` has zero `db.execute(sql\`...\`)` calls
- `incrementViewCount` produces identical DB state to the old implementation
