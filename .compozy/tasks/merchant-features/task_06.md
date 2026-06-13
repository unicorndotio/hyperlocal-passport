---
status: pending
title: CouponManager Island with Template Presets
type: frontend
complexity: high
dependencies:
  - task_02
---

# Task 06: CouponManager Island with Template Presets

## Overview

Rewrite the CouponManager island to support the new discriminated union Coupon shape with a template preset selector, conditional behavior-type-specific fields, and an expandable restriction panel. The UI provides 5 template presets (Simple Discount, Flash Sale, Loyalty Perk, Event Promo, Item Clearance) that pre-fill restriction defaults, with a "Custom" option for full manual configuration.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- The island MUST provide a template preset selector with 5 presets (Simple Discount, Flash Sale, Loyalty Perk, Event Promo, Item Clearance) plus a Custom option
- Template presets MUST be client-side only — hardcoded in the island, no server storage
- Each template preset MUST pre-fill behavior type, restriction defaults, and display a human-readable description
- The form MUST show conditional fields based on the selected behavior type (e.g., BOGO shows buyQuantity, freeQuantity, unitPriceCents; percentage_discount shows percent)
- The restriction panel MUST be an expandable/collapsible section with all restriction fields (globalCap, userCap, validFrom, validUntil, usageFrequency, maxUnitsPerRedemption, minimumPurchaseValueCents)
- Client-side validation MUST enforce behavior-type-specific required fields before submission
- The coupon table MUST display the behavior type and restriction summary for each coupon
- Inline editing MUST allow changing behavior type, restrictions, and active status
- The form MUST POST to `/api/businesses/${businessId}/coupons` with the new Coupon shape
- All text in the UI MUST be in English per project convention

## Subtasks

- [ ] 6.1 Design and implement the template preset selector UI with 5 presets
- [ ] 6.2 Implement conditional behavior-type-specific form fields
- [ ] 6.3 Build the expandable restriction panel with all restriction fields
- [ ] 6.4 Add client-side validation for behavior-type-specific required fields
- [ ] 6.5 Update the coupon table to show behavior type and restriction summary
- [ ] 6.6 Wire the form to POST/PATCH endpoints with the new Coupon shape
- [ ] 6.7 Add inline editing for behavior, restrictions, and active status
- [ ] 6.8 Write island component tests

## Implementation Details

The CouponManager island at `islands/CouponManager.tsx` currently renders a table of coupons and a simple form with title, type dropdown (basic/special), discount %, validUntil, globalLimit, userMonthlyLimit, and description. This is a major rewrite.

Template presets are hardcoded as a constant array in the island. Each preset defines `{ id, name, description, icon, defaults: { behavior, restrictions } }`. The "Custom" preset starts with empty fields.

The behavior-type-specific fields switch based on the selected behavior type:
- `percentage_discount`: percent slider/input (1-100)
- `fixed_amount`: amountCents input (BRL)
- `bogo`: buyQuantity, freeQuantity, unitPriceCents
- `item_specific`: unitPriceCents, discountPerUnitCents

The restriction panel is a collapsible section below the behavior fields. All restriction fields are optional.

Use `@preact/signals` for form state (matching existing island patterns). Use existing UI components from `components/ui/` for inputs, buttons, badges, and collapsible sections.

See TechSpec "Component Overview" section for the CouponManager responsibility. Reference ADR-001 for the template preset design rationale.

### Relevant Files
- `islands/CouponManager.tsx` — Main island to rewrite
- `lib/coupon.ts` — Coupon type with BehaviorType and restrictions
- `components/ui/button.tsx` — UI button component
- `components/ui/badge.tsx` — UI badge component
- `components/ui/card.tsx` — UI card component (for template cards)

### Dependent Files
- `routes/api/businesses/[id]/coupons.ts` — POST endpoint consumed by this island

### Related ADRs
- ADR-001: Coupon Engine Architecture — Discriminated Union with Template Presets

## Deliverables

- Fully rewritten `CouponManager.tsx` with template presets, conditional fields, and restriction panel
- Client-side validation for all behavior types
- Coupon table showing behavior type badges and restriction summaries
- Inline editing support
- Island component tests with 80%+ coverage

## Tests

- Component tests:
  - [ ] Template preset selector renders all 5 presets plus Custom
  - [ ] Selecting a preset pre-fills behavior and restriction fields correctly
  - [ ] Switching behavior type shows/hides the correct conditional fields
  - [ ] BOGO fields: buyQuantity, freeQuantity, unitPriceCents all present
  - [ ] Item-specific fields: unitPriceCents, discountPerUnitCents all present
  - [ ] Restriction panel is collapsible and expandable
  - [ ] Client-side validation rejects submission with missing required behavior fields
  - [ ] Client-side validation allows submission with all required fields
  - [ ] Coupon table displays behavior type badge
  - [ ] Inline edit toggles correctly
- Test coverage target: >=80%
- All tests must pass

## Success Criteria

- All tests passing
- Test coverage >=80%
- Merchants can create all 4 coupon types through the UI
- Template presets correctly pre-fill defaults
- Restriction fields are editable and submitted correctly
