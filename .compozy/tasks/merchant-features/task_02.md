---
status: pending
title: Coupon CRUD API + Tests
type: backend
complexity: medium
dependencies:
  - task_01
---

# Task 02: Coupon CRUD API + Tests

## Overview

Update the coupon creation (POST) and update (PATCH) API endpoints to validate and persist the new discriminated union Coupon shape. This task ensures that coupons with all 4 behavior types and all restriction fields can be created, read, updated, and deleted through the existing API surface.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- POST `/api/businesses/[id]/coupons` MUST validate the new Coupon shape including behavior-type-specific required fields
- PATCH `/api/coupons/[id]` MUST validate partial updates against the new Coupon shape
- Both endpoints MUST reject requests with missing required fields per behavior type (e.g., bogo requires buyQuantity, freeQuantity, unitPriceCents)
- The GET endpoint (unchanged logic) MUST return Coupon objects in the new shape
- The DELETE endpoint (unchanged logic) MUST continue working with the new shape
- Existing coupon tests MUST be updated to use the new shape
- Test cases MUST cover all 4 behavior types for creation and update
</requirements>

## Subtasks

- [ ] 2.1 Update POST handler validation in `routes/api/businesses/[id]/coupons.ts` for behavior-type-specific required fields
- [ ] 2.2 Update PATCH handler validation in `routes/api/coupons/[id].ts` for partial updates on new shape
- [ ] 2.3 Verify GET and DELETE handlers work correctly with new shape (no logic change expected)
- [ ] 2.4 Write comprehensive test cases for CRUD with all behavior types

## Implementation Details

The POST handler at `routes/api/businesses/[id]/coupons.ts` currently accepts `{ title, type, discountPercent, description, globalLimit, userMonthlyLimit, validUntil, isActive }`. It needs to accept `{ title, description, behavior, restrictions, isActive }` with validation that ensures behavior-type-specific required fields are present.

The PATCH handler at `routes/api/coupons/[id].ts` currently reads any JSON body and calls `adapter.update()`. It needs updated validation for the new shape while supporting partial updates (e.g., updating only `restrictions.globalCap` without resending the entire object).

Reference TechSpec "API Endpoints" section for the modified endpoint list.

### Relevant Files
- `routes/api/businesses/[id]/coupons.ts` — POST handler that creates coupons
- `routes/api/coupons/[id].ts` — PATCH/PUT handler for updates, GET for read, DELETE
- `tests/coupon_api.test.ts` — Existing CRUD tests to update
- `lib/coupon.ts` — New Coupon type (from task 01)

### Dependent Files
- `islands/CouponManager.tsx` — Consumes the API, will need matching UI in task 06
- `routes/api/coupons/[id]/redeem.ts` — Reads coupons (task 03)

### Related ADRs
- ADR-001: Coupon Engine Architecture — Discriminated Union with Template Presets

## Deliverables

- Updated POST handler with behavior-type-aware validation
- Updated PATCH handler with partial update support for new shape
- Updated test suite with creation/update tests for all 4 behavior types
- Unit tests with 80%+ coverage for validation logic
- Integration tests for CRUD operations

## Tests

- Integration tests (`tests/coupon_api.test.ts`):
  - [ ] Create coupon with `percentage_discount` behavior succeeds
  - [ ] Create coupon with `fixed_amount` behavior succeeds
  - [ ] Create coupon with `bogo` behavior succeeds (requires buyQuantity, freeQuantity, unitPriceCents)
  - [ ] Create coupon with `item_specific` behavior succeeds (requires unitPriceCents, discountPerUnitCents)
  - [ ] Create coupon with all restriction fields succeeds
  - [ ] Create coupon omitting required behavior field returns 400
  - [ ] Create coupon with invalid behavior type returns 400
  - [ ] Update behavior on existing coupon succeeds
  - [ ] Update restrictions partially succeeds
  - [ ] Delete coupon with new shape succeeds
- Test coverage target: >=80%
- All tests must pass

## Success Criteria

- All tests passing
- Test coverage >=80%
- Coupons with all 4 behavior types can be created and persisted via the API
