---
status: pending
title: Build Business Validation Dashboard
type: frontend
complexity: medium
dependencies:
  - task_12
---

# Task 13: Build Business Validation Dashboard

## Overview

Develop the simple, robust interface that cashiers will keep open on their
terminals. It allows them to scan a QR code or manually type the resident's
coupon code, input the purchase amount, and execute the checkout validation.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- MUST provide an input field for the alphanumeric code (with auto-capitalization and formatting).
- MUST optionally integrate a JS-based barcode scanner using the device camera.
- MUST provide an input for the total purchase amount (R$).
- MUST call `POST /api/transactions/validate` and clearly display the "Discount Applied" and "Final Amount to Charge" on success.
- MUST show clear error messages if the code is invalid or already used.
</requirements>

## Subtasks

- [ ] 13.1 Create the checkout dashboard route for businesses.
- [ ] 13.2 Build the input form (Code + Amount).
- [ ] 13.3 Implement currency formatting for the Amount input (handling
      cents/reais).
- [ ] 13.4 Implement an optional camera-based QR scanner component (e.g.,
      `html5-qrcode`).
- [ ] 13.5 Wire the form submission to the validation API and build the result
      display view.

## Implementation Details

This interface needs to be fast and large, as cashiers operate quickly. Errors
must be prominent. Currency should be converted properly before sending
`amountCents` to the backend.

### Relevant Files

- `routes/business/checkout.tsx`
- `islands/CheckoutCalculator.tsx`

### Dependent Files

- None.

### Related ADRs

- [ADR-004: Coupon-Based Validation System](../adrs/adr-004.md)

## Deliverables

- Interactive cashier dashboard UI.
- QR Scanner integration.
- Unit tests with 80%+ coverage **(REQUIRED)**
- Integration tests for UI interactions **(REQUIRED)**

## Tests

- Unit tests:
  - [ ] Currency input correctly converts "R$ 100,50" to `10050` cents.
  - [ ] Form displays error message if API returns 400 Bad Request.
- Integration tests:
  - [ ] E2E flow typing a code, entering an amount, and seeing the successful
        discount applied screen.
- Test coverage target: >=80%
- All tests must pass

## Success Criteria

- All tests passing
- Test coverage >=80%
- Cashiers can validate a discount in under 5 seconds.
