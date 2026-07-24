---
status: completed
title: Business Profile API Updates
type: backend
complexity: low
dependencies:
  - task_01
---

# Task 02: Business Profile API Updates

## Overview
Updates the existing business update API to accept and validate the new address and maps fields, enabling partners to save their complete profile.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- MUST validate the new incoming address fields (`cep`, `street`, `number`, `neighborhood`, `mapsUrl`) on `PUT /api/businesses/:id`.
- MUST allow the new taxonomy of categories to pass validation.
</requirements>

## Subtasks
- [x] 02.1 Update the validation schema in the Business profile API.
- [x] 02.2 Ensure the database update operation persists the new fields.

## Implementation Details
Reference API Design section of the TechSpec.

### Relevant Files
- `routes/api/businesses/[id]/profile.ts` — API endpoint for updating a business profile.
- `lib/business.ts` — may contain shared Zod schemas for business profiles.

### Dependent Files
- `routes/business/profile.tsx` — relies on this API.

## Deliverables
- Updated API endpoint handling new fields.
- Unit tests with 80%+ coverage **(REQUIRED)**

## Tests
- Unit tests:
  - [ ] Validation path: valid payload with new fields succeeds.
  - [ ] Validation path: invalid category fails.
- Integration tests:
  - [ ] End-to-end API call updates the database correctly.
- Test coverage target: >=80%
- All tests must pass

## Success Criteria
- All tests passing
- Test coverage >=80%
