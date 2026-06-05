---
status: completed
title: Build Coupon Engine API & Redemption Logic
type: backend
complexity: high
dependencies:
  - task_07
---

# Task 09: Build Coupon Engine API & Redemption Logic

## Overview

Implement the core promotional logic of the application: the Coupon Engine. This
enables businesses to create basic and special offers, and allows residents to
securely redeem them while respecting strict usage limits to prevent abuse.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- [x] MUST provide CRUD API for creating `Coupon` records (basic or special types).
- [x] MUST implement `POST /api/coupons/:id/redeem` to handle user redemptions.
- [x] MUST enforce `globalLimit` using Deno KV atomic transactions to prevent race conditions when a coupon runs out.
- [x] MUST enforce `userMonthlyLimit` by checking previous redemptions for that user.
- [x] MUST generate a short, easily typable alphanumeric `Redemption` code upon successful redeem.
- [x] MUST save the generated code in KV for fast lookup during checkout validation.
</requirements>

## Subtasks

- [x] 9.1 Create endpoints for Coupon CRUD
      (`routes/api/businesses/:id/coupons.ts`).
- [x] 9.2 Implement the atomic redeem logic in
      `routes/api/coupons/[id]/redeem.ts`.
- [x] 9.3 Write a utility to generate clean, short alphanumeric codes (excluding
      ambiguous chars like 0, O, I, l).
- [x] 9.4 Ensure atomic operations rollback correctly if limits are reached
      concurrently.

## Implementation Details

The `kv.atomic().check()` method is crucial here. When a user redeems a coupon
with `globalLimit: 10`, you must read `globalClaimedCount`, ensure it is `< 10`,
and atomic check the versionstamp when incrementing it.

### Relevant Files

- `routes/api/businesses/[id]/coupons.ts`
- `routes/api/coupons/[id]/redeem.ts`

### Dependent Files

- None.

### Related ADRs

- [ADR-004: Coupon-Based Validation System](../adrs/adr-004.md)

## Deliverables

- Coupon CRUD API.
- Atomic redemption API endpoint.
- Code generator utility.
- Unit tests with 80%+ coverage **(REQUIRED)**
- Integration tests for concurrent redemptions **(REQUIRED)**

## Tests

- Unit tests:
  - [ ] Alphanumeric code generator outputs correct format.
  - [ ] Rejects redemption if `userMonthlyLimit` is reached.
  - [ ] Rejects redemption if `validUntil` timestamp has passed.
- Integration tests:
  - [ ] Concurrent requests to redeem the last available global coupon only
        grant it to one user.
- Test coverage target: >=80%
- All tests must pass

## Success Criteria

- All tests passing
- Test coverage >=80%
- Atomic checks prevent any limits from being exceeded under heavy load.
