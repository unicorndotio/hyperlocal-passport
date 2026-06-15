---
status: completed
title: Redeem API with Analytics Counters
type: backend
complexity: medium
dependencies:
  - task_01
  - task_02
---

# Task 03: Redeem API with Analytics Counters

## Overview

Update the coupon redemption endpoint to read the redemption counter from the analytics KV prefix (`['analytics', couponId, 'redemptions']`) instead of `coupon.globalClaimedCount`, and atomically increment the analytics counter on successful redemption. This implements ADR-003's decoupling of analytics counters from the Coupon document.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- Redemption counter MUST be read from `['analytics', couponId, 'redemptions']` instead of `coupon.globalClaimedCount`
- The atomic transaction MUST include an increment on the analytics redemption key alongside existing operations
- The `globalClaimedCount` field MUST NOT appear anywhere in the redeem flow
- Global cap enforcement MUST use the analytics counter value
- The analytics counter check and increment MUST be part of the same atomic transaction as the redemption creation
- Existing redemption tests MUST be updated to reflect the new counter pattern
</requirements>

## Subtasks

- [x] 3.1 Replace `coupon.globalClaimedCount` read with `['analytics', couponId, 'redemptions']` KV read in `redeem.ts`
- [x] 3.2 Add analytics counter increment to the atomic transaction in `redeem.ts`
- [x] 3.3 Remove `coupon.globalClaimedCount` from the atomic check (no longer tracking on Coupon document)
- [x] 3.4 Update existing tests in `tests/coupon_redeem_api.test.ts` for new analytics key pattern

## Implementation Details

The `redeem.ts` handler currently fetches the coupon, checks `coupon.globalClaimedCount < coupon.globalLimit`, then atomically updates the coupon with incremented `globalClaimedCount`. After this task, it fetches the analytics counter value from `['analytics', couponId, 'redemptions']`, compares against `coupon.restrictions.globalCap`, and atomically increments the analytics key instead of updating the coupon document.

The atomic transaction still checks the coupon's versionstamp (to detect edits during redemption), but no longer modifies the coupon document itself — only the analytics key, redemption record, monthly counter, and indexes.

See TechSpec "Data Flow" section for the updated redeem flow diagram. Reference ADR-003 for the rationale on analytics prefix decoupling.

### Relevant Files
- `routes/api/coupons/[id]/redeem.ts` — Main redeem handler to modify
- `lib/analytics.ts` — Analytics key builders (from task 01)
- `lib/coupon.ts` — Updated Coupon type with restrictions (from task 01)
- `tests/coupon_redeem_api.test.ts` — Tests to update

### Dependent Files
- `routes/api/transactions/validate.ts` — Uses redemption records created here (task 04)

### Related ADRs
- ADR-003: Analytics Counters in Dedicated KV Prefix

## Deliverables

- Updated `redeem.ts` with analytics counter reads and atomic increments
- `globalClaimedCount` fully removed from the redeem flow
- Updated integration tests for global cap enforcement via analytics key
- Unit tests with 80%+ coverage

## Tests

- Integration tests (`tests/coupon_redeem_api.test.ts`):
  - [x] Redemption succeeds when analytics counter is below global cap
  - [x] Redemption fails when analytics counter at or above global cap
  - [x] Analytics counter increments atomically on successful redemption
  - [x] Concurrent redemptions respect global cap (race condition test)
  - [x] Unauthorized access returns 401
  - [x] Inactive coupon returns appropriate error
  - [x] Expired coupon returns appropriate error
- Test coverage target: >=80%
- All tests must pass

## Success Criteria

- All tests passing
- Test coverage >=80%
- Redemption counter correctly persists and is readable from analytics prefix
- No references to `globalClaimedCount` remain in the redeem flow
