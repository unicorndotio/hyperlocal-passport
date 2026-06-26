---
status: completed
title: CheckoutCalculator Island with Quantity Input
type: frontend
complexity: medium
dependencies:
  - task_04
---

# Task 07: CheckoutCalculator Island with Quantity Input

## Overview

Update the CheckoutCalculator island to conditionally show a quantity input field for BOGO and item-specific coupon types, dynamically display the itemized discount breakdown, and wire the quantity value to the validate API call. This ensures cashiers can enter a count of items consumed rather than a total amount for quantity-based coupon types.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- The CheckoutCalculator island MUST conditionally show a quantity input field when the resolved coupon type is `bogo` or `item_specific`
- For `percentage_discount` and `fixed_amount`, the existing amount input field MUST be shown without quantity
- The quantity input MUST be a positive integer field with a minimum of 1
- The success display MUST show an itemized breakdown: unit price, quantity, subtotal, discount applied, and final amount
- The quantity value MUST be included in the POST body to `/api/transactions/validate` as `{ code, amountCents?, quantity? }`
- The amountCents field SHOULD be hidden or auto-calculated when quantity is used
- Error handling MUST display server-side validation errors (e.g., "minimum purchase value not met")
- All text MUST be in English per project convention

## Subtasks

- [x] 7.1 Add conditional rendering logic that shows quantity input for BOGO/item-specific coupons
- [x] 7.2 Implement quantity input component with validation (positive integer, min 1)
- [x] 7.3 Update the API call to include quantity in the request body when applicable
- [x] 7.4 Redesign the success display to show itemized discount breakdown
- [x] 7.5 Add error display for server-side validation messages
- [x] 7.6 Write island component tests

## Implementation Details

The CheckoutCalculator at `islands/CheckoutCalculator.tsx` currently has a QR scanner, manual code input, amount input, and posts `{ code, amountCents }` to the validate endpoint. After this task:

1. When a coupon code is resolved (by lookup or after scanning), the island fetches the coupon type and conditionally renders either the amount input or the quantity input
2. The quantity input is a number input with validation (integer >= 1)
3. On submit, the request body includes `quantity` when applicable
4. The success response displays the full CalculationResult: unit price info, quantity, subtotal, discount, and final amount

Use `@preact/signals` for state management (matching existing pattern). The coupon type can be determined from the lookup — the QR scan already resolves the coupon code; the coupon data is available from the redemption record.

See TechSpec "Component Overview" section for CheckoutCalculator responsibility. Reference ADR-004 for the quantity field API design.

### Relevant Files
- `islands/CheckoutCalculator.tsx` — Main island to modify
- `routes/api/transactions/validate.ts` — API endpoint called by this island
- `lib/coupon.ts` — Coupon types for behavior type checking
- `lib/utils.ts` — formatBRL() for currency display

### Dependent Files
- (none — this island is a consumer of the API)

### Related ADRs
- ADR-004: Extend Existing Validate Endpoint with Optional Quantity Field

## Deliverables

- Updated `CheckoutCalculator.tsx` with conditional quantity input
- Itemized discount breakdown in success display
- Quantity wired to API call
- Error handling for server-side validation messages
- Island component tests with 80%+ coverage

## Tests

- Component tests:
  - [x] Amount input shown for percentage_discount coupon
  - [x] Amount input shown for fixed_amount coupon
  - [x] Quantity input shown for bogo coupon
  - [x] Quantity input shown for item_specific coupon
  - [x] Quantity input rejects non-positive values
  - [x] Success display shows unit price, quantity, subtotal, discount, final amount
  - [x] API call includes quantity in body when quantity input is shown
  - [x] API call omits quantity when amount input is shown
  - [x] Server error messages are displayed to the user
- Test coverage target: >=80%
- All tests must pass

## Success Criteria

- All tests passing
- Test coverage >=80%
- Cashiers can enter quantity for BOGO/item-specific coupons
- Success display shows itemized breakdown
- Error messages from server are properly displayed
