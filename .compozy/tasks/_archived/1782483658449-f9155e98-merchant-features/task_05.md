---
status: completed
title: View Counter for Coupon Analytics
type: backend
complexity: low
dependencies:
  - task_01
---

# Task 05: View Counter for Coupon Analytics

## Overview

Add an analytics view counter increment to the business detail page route handler so that each time a resident views a coupon on the business page, the `['analytics', couponId, 'views']` counter is incremented. This is a small, focused task that wires up the "views" metric for the analytics funnel.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- The `GET /business/[id]` route handler MUST increment `['analytics', couponId, 'views']` for each coupon displayed on the page
- The increment MUST happen after the page renders (fire-and-forget pattern — not blocking page load)
- The view counter MUST use `Deno.Kv.prototype.set()` or `atomic().sum()` for the increment
- Zero views MUST be handled gracefully (no entries for coupons that have never been viewed)
- This task MUST NOT modify the page rendering logic or HTML output
</requirements>

## Subtasks

- [x] 5.1 Add view counter increment to the `routes/business/[id].tsx` handler after page render
- [x] 5.2 Use the analytics key builder from `lib/analytics.ts` for the KV key
- [x] 5.3 Write a test verifying the counter increment

## Implementation Details

The route at `routes/business/[id].tsx` renders the business detail page with all coupons listed. After the response is generated, or in a non-blocking fire-and-forget pattern, increment each displayed coupon's view counter. Use `kv.atomic().sum([...analyticsKey, 'views'], 1n).commit()` to atomically increment the counter.

Since the handler currently doesn't use `kv`, you'll need to import it from `lib/kv.ts`. The increment should not block the response — consider using `ctx.waitUntil()` or simply not awaiting the increment promise.

Reference TechSpec "Data Flow" section for view counter placement.

### Relevant Files
- `routes/business/[id].tsx` — Business detail page route, renders coupon list
- `lib/analytics.ts` — Analytics key builders
- `lib/kv.ts` — Deno KV singleton

### Dependent Files
- `routes/api/businesses/[id]/analytics.ts` — Reads view counter (task 08)

### Related ADRs
- ADR-003: Analytics Counters in Dedicated KV Prefix

## Deliverables

- Updated `routes/business/[id].tsx` with view counter increment logic
- Test verifying the counter increments correctly
- Test verifying page load is not blocked by counter write

## Tests

- Integration tests:
  - [x] GET `/business/[id]` increments view counter for each coupon on the page
  - [x] Repeated views increment the counter monotonically
  - [x] Counter increment does not block or delay the page response
  - [x] Coupons that were never viewed have zero or no entry in analytics prefix
- Test coverage target: >=80%
- All tests must pass

## Success Criteria

- All tests passing
- Test coverage >=80%
- View counter correctly increments on business page visits
- Page response time is not affected by counter writes
