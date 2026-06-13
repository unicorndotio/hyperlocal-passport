---
status: pending
title: Coupon Data Model + CouponEngine
type: backend
complexity: medium
dependencies: []
---

# Task 01: Coupon Data Model + CouponEngine

## Overview

Refactor the Coupon type from a flat shape with `discountPercent` to a discriminated union of 4 behavior types (percentage_discount, fixed_amount, bogo, item_specific) with an embedded restrictions object. Implement the pure-function `CouponEngine` module for discount calculation dispatch and analytics key builders in a dedicated module. This is the foundational task that all other backend tasks depend on.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- Coupon interface MUST be refactored to use a discriminated union `BehaviorType` with 4 variants: `percentage_discount` (percent field), `fixed_amount` (amountCents field), `bogo` (buyQuantity, freeQuantity, unitPriceCents fields), `item_specific` (unitPriceCents, discountPerUnitCents fields)
- Coupon MUST have a `restrictions: CouponRestrictions` object with optional fields: globalCap, userCap, validFrom, validUntil, usageFrequency, maxUnitsPerRedemption, applicationScope, minimumPurchaseValueCents
- `globalClaimedCount` field MUST be removed from the Coupon type (moved to analytics prefix per ADR-003)
- `CouponEngine.calculate()` MUST be a pure function that dispatches on behavior.type and returns { totalAmountCents, discountAppliedCents, finalAmountCents }
- `CouponEngine.validateRedemption()` MUST check coupon active state, valid dates, global limit, and user limit
- `CouponEngine.checkMinimumPurchase()` MUST return boolean for minimum purchase value check
- Analytics key builders MUST be in `lib/analytics.ts` with keys at `['analytics', couponId, 'views'|'redemptions'|'validations']`
- All existing imports of `Coupon` across the codebase MUST be updated to compile with the new shape
- The Transaction interface in `lib/coupon.ts` MUST be updated to include `totalAmountCents` (renamed from `totalAmount`), `discountAppliedCents`, `finalAmountCents`
</requirements>

## Subtasks

- [ ] 1.1 Define `BehaviorType` discriminated union with all 4 variants in `lib/coupon.ts`
- [ ] 1.2 Define `CouponRestrictions` interface with all optional restriction fields in `lib/coupon.ts`
- [ ] 1.3 Refactor `Coupon` interface: add `behavior: BehaviorType`, `restrictions: CouponRestrictions`, remove `type`, `discountPercent`, `globalClaimedCount`, `globalLimit`, `userMonthlyLimit`, `validUntil`
- [ ] 1.4 Rename `Transaction.totalAmount` to `totalAmountCents`, update `Transaction` with `discountAppliedCents` and `finalAmountCents`
- [ ] 1.5 Implement `lib/coupon-engine.ts` with `calculate()`, `validateRedemption()`, and `checkMinimumPurchase()` pure functions
- [ ] 1.6 Implement `lib/analytics.ts` with key builder functions for views, redemptions, and validations counters
- [ ] 1.7 Update all existing files that import or reference the old `Coupon` shape to compile successfully
- [ ] 1.8 Write unit tests for CouponEngine in `tests/coupon_engine.test.ts`

## Implementation Details

Modify `lib/coupon.ts` to replace the existing flat Coupon interface with the discriminated union pattern. The existing `type: 'basic' | 'special'` field, `discountPercent`, `globalClaimedCount`, `globalLimit`, `userMonthlyLimit`, and `validUntil` fields are removed. The new `behavior` field uses a `type` discriminant field for exhaustiveness checking.

Create `lib/coupon-engine.ts` as a new module exporting only pure functions — no classes, no side effects. The `calculate()` function switches on `behavior.type` and applies the appropriate formula. The `validateRedemption()` function checks the coupon's active state, date windows, and caps by reading the analytics counter key rather than a field on the coupon document.

Create `lib/analytics.ts` with constant key builders using `['analytics']` as the root prefix.

The Transaction interface field rename from `totalAmount` to `totalAmountCents` ensures consistency with the rest of the codebase's cents convention. See TechSpec "Core Interfaces" section for exact type shapes.

### Relevant Files
- `lib/coupon.ts` — Existing Coupon, Redemption, Transaction interfaces — needs full refactor
- `lib/coupon-engine.ts` — New file to create
- `lib/analytics.ts` — New file to create
- `islands/CouponManager.tsx` — Imports Coupon type, will need update
- `islands/CheckoutCalculator.tsx` — Imports Coupon type, will need update
- `islands/RedeemButton.tsx` — Imports Coupon type, will need update
- `routes/api/coupons/[id]/redeem.ts` — Uses Coupon type, will need update
- `routes/api/coupons/[id].ts` — Uses Coupon type, will need update
- `routes/api/businesses/[id]/coupons.ts` — Uses Coupon type, will need update
- `routes/api/transactions/validate.ts` — Uses Coupon and Transaction types, will need update

### Dependent Files
- All files importing from `lib/coupon.ts` — Interface changes cascade to every consumer

### Related ADRs
- ADR-001: Coupon Engine Architecture — Discriminated Union with Template Presets
- ADR-003: Analytics Counters in Dedicated KV Prefix

## Deliverables

- `lib/coupon.ts` updated with new Coupon, BehaviorType, CouponRestrictions, and updated Transaction interfaces
- `lib/coupon-engine.ts` with calculate(), validateRedemption(), checkMinimumPurchase()
- `lib/analytics.ts` with analytics key builder functions
- All existing imports updated to compile cleanly
- Unit tests with 80%+ coverage for CouponEngine pure functions
- `deno check` passes on all modified files

## Tests

- Unit tests (`tests/coupon_engine.test.ts`):
  - [ ] `calculate()` with `percentage_discount`: exact percent, floor rounding, zero amountCents, over 100%
  - [ ] `calculate()` with `fixed_amount`: under total, over total, exact match, zero amountCents
  - [ ] `calculate()` with `bogo`: exact sets (e.g., buy 2 get 1 free x 3 = 1 free), partial sets with remainder, single unit, maxUnitsPerRedemption edge
  - [ ] `calculate()` with `item_specific`: single unit, multiple units, zero quantity, discount > unit price
  - [ ] `calculate()` without quantity for percentage/fixed (quantity ignored)
  - [ ] `validateRedemption()`: active coupon passes, expired fails, global cap reached fails, no cap passes
  - [ ] `checkMinimumPurchase()`: above threshold passes, below fails, no threshold set passes
- Test coverage target: >=80%
- All tests must pass

## Success Criteria

- All tests passing
- Test coverage >=80%
- `deno check` passes on all modified files
- New Coupon shape correctly serializes/deserializes with Deno KV
