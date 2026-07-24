---
status: pending
title: Inactive Dashboard State & Hide Analytics
type: frontend
complexity: medium
dependencies: []
---

# Task 07: Inactive Dashboard State & Hide Analytics

## Overview
Restricts the UI for inactive businesses to a read-only mode and temporarily hides the analytics section for all users.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- MUST display a warning banner on the dashboard for businesses with `isActive == false`.
- MUST disable all "Create" and "Edit" buttons on the Campaigns and Posts pages if `isActive == false`.
- MUST hide the "Analytics" navigation link from the partner dashboard sidebar.
</requirements>

## Subtasks
- [ ] 07.1 Create a warning banner component.
- [ ] 07.2 Update the Coupon and Posts island components to accept an `isActive` prop and disable mutation actions accordingly.
- [ ] 07.3 Remove or hide the Analytics link from the main layout navigation.

## Implementation Details
Reference ADR-001 for the decision to use client-side UI disablement.

### Relevant Files
- `components/BusinessHeader.tsx` (or similar layout file) — to hide analytics and show the banner.
- `islands/CouponManager.tsx` — to disable creation.
- `routes/business/posts.tsx` — to disable creation.

### Dependent Files
- None.

### Related ADRs
- [ADR-001: Inactive Business Restrictions via Client-Side UI Disablement](../adrs/adr-001.md)

## Deliverables
- Updated layout and island components.
- Unit tests with 80%+ coverage **(REQUIRED)**

## Tests
- Unit tests:
  - [ ] Read-only state: if `isActive` is false, create button is disabled.
  - [ ] Layout rendering: Analytics link is not present.
- Integration tests:
  - [ ] None required.
- Test coverage target: >=80%
- All tests must pass

## Success Criteria
- All tests passing
- Test coverage >=80%
