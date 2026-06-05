---
status: completed
title: Build Mobile Catalog & Redemption UI
type: frontend
complexity: high
dependencies:
  - task_09
---

# Task 11: Build Mobile Catalog & Redemption UI

## Overview

Develop the primary resident-facing web app experience where they can browse
local businesses, view available discounts, and click to "redeem" a coupon,
generating the code they will use at the cashier.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- MUST provide a catalog view categorized by segments (Casa, Corpo, Alimentação, etc).
- MUST provide a business detail view showing available coupons.
- MUST handle the redemption action by calling `POST /api/coupons/:id/redeem`.
- MUST display the generated alphanumeric `Redemption` code.
- MUST render a standard visual QR Code representing the alphanumeric code so it can be easily scanned by the cashier.
- MUST show a list of the user's currently active (un-used) redemptions.
</requirements>

## Subtasks

- [x] 11.1 Build the Catalog listing page with category filters.
- [x] 11.2 Build the Business Detail page to list available coupons.
- [x] 11.3 Build the interactive Redeem button handling success/error states.
- [x] 11.4 Build the "Passaporte" screen showing the active alphanumeric codes
      and generating the QR Code visually (e.g., using `qrcode.react` or
      similar).
- [x] 11.5 Implement `GET /api/users/me/redemptions` logic to fetch the active
      codes.

## Implementation Details

Focus heavily on mobile-first design using Tailwind. The QR code generation
happens purely on the frontend, simply encoding the alphanumeric string returned
by the redemption API.

### Relevant Files

- `routes/catalog.tsx`
- `routes/business/[id].tsx`
- `routes/passaporte.tsx`
- `islands/RedeemButton.tsx`
- `islands/QRCodeDisplay.tsx`

### Dependent Files

- None.

### Related ADRs

- [ADR-004: Coupon-Based Validation System](../adrs/adr-004.md)

## Deliverables

- Mobile Catalog and Business Detail views.
- Active "Passaporte" view with QR Code generation.
- Unit tests with 80%+ coverage **(REQUIRED)**
- Integration tests for redemption flow **(REQUIRED)**

## Tests

- Unit tests:
  - [ ] QR Code component successfully renders a valid barcode based on a
        string.
  - [ ] Redeem button handles API error responses (e.g., out of stock)
        correctly.
- Integration tests:
  - [ ] User navigates to business, redeems coupon, and sees the new code in
        their Passaporte.
- Test coverage target: >=80%
- All tests must pass

## Success Criteria

- All tests passing
- Test coverage >=80%
- Residents have a seamless discovery and redemption experience.
