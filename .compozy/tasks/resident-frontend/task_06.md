---
status: completed
title: 'MV refresh integration on coupon creation'
type: backend
complexity: low
dependencies:
  - task_01
---

# Task 06: MV refresh integration on coupon creation

## Overview

Add a `refreshFeedView()` call to the existing coupon creation endpoint so that when a business creates a new coupon, the corresponding `coupon_released` event appears in the resident feed. This keeps the feed fresh with merchant promotional content without manual intervention.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- MUST add `refreshFeedView()` call after successful coupon creation in the existing coupon write endpoints
- MUST NOT change any existing coupon creation logic or response format
- MUST handle MV refresh failure gracefully (log error, do not block coupon creation response)
</requirements>

## Subtasks

- [x] 06.1 Identify all coupon write endpoints (create, update, activate/deactivate)
- [x] 06.2 Add `refreshFeedView()` call after each write, guarded by try/catch
- [x] 06.3 Write tests verifying MV refresh occurs on coupon creation

## Implementation Details

The `refreshFeedView()` function was created in task_01 and lives in `lib/feed.ts`. The existing coupon management endpoints are in `routes/api/coupons/[id].ts` (and potentially `routes/api/admin/coupons/`).

The call should be non-blocking: wrap it in a try/catch, log any errors, and return the coupon creation response as normal. A failed MV refresh should not prevent coupon creation.

### Relevant Files

- `routes/api/coupons/[id].ts` — Add refreshFeedView call after write operations
- `lib/feed.ts` — `refreshFeedView()` (from task_01)
- `routes/api/admin/coupons/index.ts` — Add refresh call if applicable
- `routes/api/admin/coupons/[id].ts` — Add refresh call if applicable

### Dependent Files

- `routes/api/feed.ts` — Feed endpoint reads from MV (task_02)

### Related ADRs

- [ADR-005: Feed Data Model — Materialized View for Global Content with User-Specific Query](../adrs/adr-005.md) — Documents MV refresh strategy

## Deliverables

- Updated coupon creation endpoints with MV refresh calls
- Tests verifying refresh behavior
- Test coverage >=80%

## Tests

- Integration tests:
  - [ ] Creating a coupon triggers `refreshFeedView()` (verify via mock or side effect)
  - [ ] MV refresh failure does not block coupon creation (verify 201 response returned)
  - [ ] Coupon appears in feed after creation and MV refresh
- Test coverage target: >=80%
- All tests must pass

## Success Criteria

- All tests passing
- Test coverage >=80%
- Coupon creation triggers feed refresh
- Feed refresh failure does not affect coupon creation
