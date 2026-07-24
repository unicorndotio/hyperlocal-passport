---
status: completed
title: Admin Ledger API Endpoints
type: backend
complexity: medium
dependencies:
  - task_01
---

# Task 03: Admin Ledger API Endpoints

## Overview
Creates the administrative APIs to record payments in the ledger and manually manage the active status and expiration dates of partner businesses.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- MUST create `POST /api/admin/businesses/:id/ledger` to log payments.
- MUST update `expirationDate` and set `isActive = true` when a payment is logged.
- MUST update `POST /api/admin/businesses/:id/toggle` to accept manual overrides of `expirationDate`.
</requirements>

## Subtasks
- [x] 03.1 Create the POST ledger endpoint.
- [x] 03.2 Implement a database transaction to insert into the ledger and update the business profile simultaneously.
- [x] 03.3 Modify the existing admin toggle endpoint to accept an optional `expirationDate`.

## Implementation Details
Reference API Design section of the TechSpec.

### Relevant Files
- `routes/api/admin/businesses/toggle.ts` (or similar) — existing toggle endpoint to update.
- `routes/api/admin/businesses/[id]/ledger.ts` — new endpoint to create.

### Dependent Files
- `islands/BusinessManager.tsx` — will call these APIs.

## Deliverables
- New ledger API endpoint.
- Updated toggle API endpoint.
- Unit tests with 80%+ coverage **(REQUIRED)**

## Tests
- Unit tests:
  - [x] Payment logging: inserting valid payment updates business active status and expiration date.
  - [x] Toggle logic: manual toggle correctly sets active status and expiration date.
- Integration tests:
  - [x] End-to-end API call creates ledger row and updates business.
- Test coverage target: >=80%
- All tests must pass

## Success Criteria
- All tests passing
- Test coverage >=80%
- Admins can successfully log a payment.
