---
status: pending
title: Build User Registration Frontend
type: frontend
complexity: medium
dependencies:
  - task_03
---

# Task 04: Build User Registration Frontend

## Overview
Create the resident-facing registration page with form fields for personal data and file upload inputs for the required documents. 

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- MUST provide a mobile-first UI form (shadcn components).
- MUST collect name, CPF, email, ID photo, and residence proof.
- MUST display a success screen informing the user about the 1-business-day SLA.
</requirements>

## Subtasks
- [ ] 4.1 Create the registration page route.
- [ ] 4.2 Build the interactive form Island using Preact.
- [ ] 4.3 Add frontend validation for CPF and file types (images/PDF).
- [ ] 4.4 Submit `multipart/form-data` to `/api/users/register`.
- [ ] 4.5 Implement loading states and the final success message.

## Implementation Details
Leverage existing `components/ui/input.tsx` and `button.tsx`. Ensure the form degrades gracefully on mobile browsers.

### Relevant Files
- `routes/register.tsx` — To be created.
- `islands/RegistrationForm.tsx` — To be created.

### Dependent Files
- None.

### Related ADRs
- None.

## Deliverables
- Interactive Preact form component.
- Success view state.
- Unit tests with 80%+ coverage **(REQUIRED)**
- Integration tests for form submission **(REQUIRED)**

## Tests
- Unit tests:
  - [ ] Form validates empty inputs before submission.
  - [ ] CPF formatting/validation works.
- Integration tests:
  - [ ] Successful API response transitions UI to success screen.
- Test coverage target: >=80%
- All tests must pass

## Success Criteria
- All tests passing
- Test coverage >=80%
- User can complete registration smoothly on a mobile device.
