---
status: completed
title: Partner Profile Frontend Updates & Categories
type: frontend
complexity: medium
dependencies:
  - task_02
---

# Task 04: Partner Profile Frontend Updates & Categories

## Overview
Updates the Partner Profile settings UI to collect new address information and enforce the new category taxonomy.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- MUST add inputs for `cep`, `street`, `number`, `neighborhood`, and `mapsUrl`.
- MUST update the business categories list globally to the new taxonomy.
- MUST display fields used during account creation (`companyName`, `name`, `cnpj`) as read-only.
</requirements>

## Subtasks
- [x] 04.1 Update the global category list/constants.
- [x] 04.2 Add new address and maps URL inputs to the profile form component.
- [x] 04.3 Make account creation fields read-only.
- [x] 04.4 Ensure form submits the updated payload to the API.

## Implementation Details
Reference the TechSpec for the list of categories and new fields.

### Relevant Files
- `routes/business/profile.tsx` — the page hosting the profile.
- `islands/ProfileForm.tsx` (or similar) — the component handling the form state.
- `lib/business.ts` — contains the category definitions.

### Dependent Files
- `routes/api/businesses/[id]/profile.ts` — the backend endpoint receiving this data.

## Deliverables
- Updated form UI.
- Updated category list.
- Unit tests with 80%+ coverage **(REQUIRED)**

## Tests
- Unit tests:
  - [ ] Profile form rendering: new fields are present.
  - [ ] Profile form submission: correct payload is constructed.
- Integration tests:
  - [ ] None required.
- Test coverage target: >=80%
- All tests must pass

## Success Criteria
- All tests passing
- Test coverage >=80%
