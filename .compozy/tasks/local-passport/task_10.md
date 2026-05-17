---
status: pending
title: Build Coupon Management UI
type: frontend
complexity: medium
dependencies:
  - task_09
---

# Task 10: Build Coupon Management UI

## Overview
Provide a web interface for business owners (and admins) to create, manage, and monitor the performance of their promotional campaigns and basic discounts within the platform.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- MUST provide a dashboard listing the business's active and expired coupons.
- MUST provide a form to create a new coupon, allowing selection of `type` (basic/special) and setting limits (`globalLimit`, `userMonthlyLimit`, `validUntil`).
- MUST display the `globalClaimedCount` vs `globalLimit` visually to the business owner.
</requirements>

## Subtasks
- [ ] 10.1 Create the business dashboard routes.
- [ ] 10.2 Build the Coupon list component displaying usage metrics.
- [ ] 10.3 Build the Coupon creation form (Island) handling optional limit fields gracefully.
- [ ] 10.4 Integrate the UI with the Coupon CRUD APIs from `task_09`.

## Implementation Details
This UI will be accessed by users with the `business` role. Ensure they only see and manage coupons belonging to their own `businessId`. Use Shadcn forms and date pickers for the `validUntil` field.

### Relevant Files
- `routes/business/coupons.tsx`
- `islands/CouponManager.tsx`

### Dependent Files
- None.

### Related ADRs
- [ADR-004: Coupon-Based Validation System](../adrs/adr-004.md)

## Deliverables
- Business dashboard for coupon management.
- Unit tests with 80%+ coverage **(REQUIRED)**
- Integration tests for UI flow **(REQUIRED)**

## Tests
- Unit tests:
  - [ ] Form validates that discount percentage is between constraints (5-30) if applicable.
- Integration tests:
  - [ ] Business user can successfully create a new special coupon and see it in the list.
- Test coverage target: >=80%
- All tests must pass

## Success Criteria
- All tests passing
- Test coverage >=80%
- Businesses can autonomously create promotional campaigns.
