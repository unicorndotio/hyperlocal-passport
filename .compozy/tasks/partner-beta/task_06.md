---
status: pending
title: Admin Ledger UI Integration
type: frontend
complexity: medium
dependencies:
  - task_03
---

# Task 06: Admin Ledger UI Integration

## Overview
Adds the UI components to the Admin Dashboard to allow administrators to log manual payments for a business.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- MUST provide a form to input payment amount and duration (months).
- MUST call the new ledger API endpoint.
- MUST display the business's current `expirationDate`.
</requirements>

## Subtasks
- [ ] 06.1 Add a "Log Payment" button or modal to the BusinessManager list/detail view.
- [ ] 06.2 Create the payment form with currency mask for the amount and integer input for months.
- [ ] 06.3 Display the `expirationDate` on the admin business list.

## Implementation Details
Reference the TechSpec for admin UI modifications.

### Relevant Files
- `islands/BusinessManager.tsx` — the admin component for managing businesses.
- `routes/admin/businesses.tsx` — the page hosting the component.

### Dependent Files
- `routes/api/admin/businesses/[id]/ledger.ts` — API endpoint called.

## Deliverables
- Updated admin UI.
- Unit tests with 80%+ coverage **(REQUIRED)**

## Tests
- Unit tests:
  - [ ] Form submission: triggers API call with correct payload.
- Integration tests:
  - [ ] None required.
- Test coverage target: >=80%
- All tests must pass

## Success Criteria
- All tests passing
- Test coverage >=80%
