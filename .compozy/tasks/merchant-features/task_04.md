---
status: completed
title: Validate API with Multi-Behavior Dispatch
type: backend
complexity: high
dependencies:
  - task_01
  - task_02
  - task_03
---

# Task 04: Validate API with Multi-Behavior Dispatch

## Overview

Rewrite the checkout validation endpoint (`POST /api/transactions/validate`) to dispatch discount calculation via `CouponEngine.calculate()` based on the coupon's behavior type. Add optional `quantity` field for BOGO and item-specific coupon types, and implement minimum purchase value enforcement. This is the most complex backend change — it fundamentally changes how discounts are calculated at checkout.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- The validate endpoint MUST accept an optional `quantity` field in the request body
- For `percentage_discount` and `fixed_amount` behaviors, `quantity` is ignored and `amountCents` is used as-is
- For `bogo` and `item_specific` behaviors, `quantity` is required and `amountCents` is calculated server-side as `unitPrice * quantity`; if the client sends `amountCents`, it is validated against the calculated value for consistency
- Discount calculation MUST dispatch through `CouponEngine.calculate()` for all behavior types
- Minimum purchase value (from `restrictions.minimumPurchaseValueCents`) MUST be checked before processing validation; if the total is below the threshold, the endpoint MUST return an error with a specific message
- Successful validation MUST increment `['analytics', couponId, 'validations']` atomically
- The Transaction record MUST use server-calculated values for `totalAmountCents`, `discountAppliedCents`, and `finalAmountCents`
- Existing percentage-based discount flow MUST continue to work unchanged for percentage_discount behavior
</requirements>

## Subtasks

- [x] 4.1 Update request body type to accept optional `quantity` field alongside `code` and `amountCents`
- [x] 4.2 Add behavior-type-aware dispatch: `percent`/`fixed` use `amountCents` as-is; `bogo`/`item-specific` require `quantity` and calculate server-side
- [x] 4.3 Integrate `CouponEngine.calculate()` for discount computation
- [x] 4.4 Add minimum purchase value check before processing validation
- [x] 4.5 Add analytics validation counter increment to the atomic transaction
- [x] 4.6 Update atomic transaction to use the new Transaction shape
- [x] 4.7 Write comprehensive integration tests covering all behavior types and error paths

## Implementation Details

The existing validate handler at `routes/api/transactions/validate.ts` currently parses `{ code, amountCents }`, calculates `discountApplied = Math.floor(amountCents * (discountPercent / 100))`, and creates a Transaction with `totalAmount`, `discountApplied`, `finalAmount`. After this task, the handler is rewritten to:

1. Parse `{ code, amountCents?, quantity? }`
2. Look up redemption + coupon (existing flow)
3. Check minimum purchase: if `coupon.restrictions.minimumPurchaseValueCents` is set and `totalAmountCents < minimumPurchaseValueCents`, return 400 with specific error
4. Dispatch to `CouponEngine.calculate({ behavior, amountCents, quantity })`
5. Use returned `{ totalAmountCents, discountAppliedCents, finalAmountCents }` for the transaction
6. Atomically mark redemption used, create transaction, update indexes, increment analytics validation counter

See TechSpec ADR-004 for the quantity field design and TechSpec "Data Flow" section for the updated validate flow.

### Relevant Files
- `routes/api/transactions/validate.ts` — Main validate handler to rewrite
- `lib/coupon-engine.ts` — CouponEngine.calculate() (from task 01)
- `lib/coupon.ts` — Updated Transaction type (from task 01)
- `lib/analytics.ts` — Analytics key builders (from task 01)
- `tests/checkout_api.test.ts` — Existing and new test cases

### Dependent Files
- `islands/CheckoutCalculator.tsx` — Frontend that calls this API (task 07)
- `islands/AnalyticsDashboard.tsx` — Reads transaction data (task 08)

### Related ADRs
- ADR-001: Coupon Engine Architecture — Discriminated Union with Template Presets
- ADR-003: Analytics Counters in Dedicated KV Prefix
- ADR-004: Extend Existing Validate Endpoint with Optional Quantity Field

## Deliverables

- Fully rewritten `validate.ts` with multi-behavior dispatch
- Minimum purchase value enforcement
- Analytics validation counter increment in atomic transaction
- Comprehensive integration tests for all behavior types and error conditions
- Unit tests with 80%+ coverage

## Tests

- Integration tests (`tests/checkout_api.test.ts`):
  - [x] `percentage_discount` validation with amountCents — works as before
  - [x] `fixed_amount` validation with amountCents — discount capped at amountCents
  - [x] `bogo` validation with quantity — server-calculates total and discount
  - [x] `item_specific` validation with quantity — server-calculates per-unit discount
  - [x] BOGO without quantity returns 400
  - [x] Item-specific without quantity returns 400
  - [x] Minimum purchase value below threshold returns 400 with descriptive message
  - [x] Minimum purchase value at/above threshold succeeds
  - [x] Minimum purchase value not set — no check performed
  - [x] Analytics validation counter increments on success
  - [x] Already-used redemption returns appropriate error
  - [x] Expired coupon returns appropriate error
  - [x] Unauthorized role returns 403
- Test coverage target: >=80%
- All tests must pass

## Success Criteria

- All tests passing
- Test coverage >=80%
- All 4 behavior types correctly validated at checkout
- Minimum purchase value enforced with clear error message
- Analytics validation counter increments on each successful validation
