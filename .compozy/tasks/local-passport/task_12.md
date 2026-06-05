---
status: completed
title: Build Checkout Validation API
type: backend
complexity: high
dependencies:
  - task_09
---

# Task 12: Build Checkout Validation API

## Overview

Implement the endpoint that the cashier uses to process a discount. It validates
the provided alphanumeric code against the active redemptions, calculates the
final price, and records the transaction atomically.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- MUST provide `POST /api/transactions/validate`.
- MUST accept `code` and `amountCents` as input.
- MUST verify the `Redemption` exists, is `status: active`, and belongs to the requesting business.
- MUST verify the underlying `Coupon` is not expired based on its `validUntil` field.
- MUST calculate `discountApplied` and `finalAmount`.
- MUST use `kv.atomic()` to simultaneously mark the Redemption as `status: used` and save the new `Transaction` record to prevent replay attacks.
</requirements>

## Subtasks

- [x] 12.1 Create the validation endpoint route.
- [x] 12.2 Lookup the Redemption by the provided alphanumeric code.
- [x] 12.3 Fetch the associated Coupon to determine the discount math.
- [x] 12.4 Calculate the transaction math using cents to avoid float precision
      issues.
- [x] 12.5 Execute the atomic mutation in Deno KV.

## Implementation Details

The `kv.atomic().check()` method is vital here. Ensure the redemption's
versionstamp is checked so that the same code cannot be processed twice
concurrently if the cashier hits "Submit" multiple times quickly.

### Relevant Files

- `routes/api/transactions/validate.ts`

### Dependent Files

- None.

### Related ADRs

- [ADR-004: Coupon-Based Validation System](../adrs/adr-004.md)

## Deliverables

- Transaction validation API endpoint.
- Atomic state transition for redemptions.
- Unit tests with 80%+ coverage **(REQUIRED)**
- Integration tests for checkout **(REQUIRED)**

## Tests

- Unit tests:
  - [ ] Calculation logic correctly applies a 15% discount on an amount in
        cents.
  - [ ] Reject requests with an already `used` code.
  - [ ] Reject requests if the code belongs to a different business.
- Integration tests:
  - [ ] Successful validation returns the final amount and marks the code as
        used in KV.
- Test coverage target: >=80%
- All tests must pass

## Success Criteria

- All tests passing
- Test coverage >=80%
- Cashiers can safely and reliably validate discounts.
