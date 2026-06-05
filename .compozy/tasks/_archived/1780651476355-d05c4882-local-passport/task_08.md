---
status: completed
title: Build Business Profile Admin UI
type: frontend
complexity: low
dependencies:
  - task_07
---

# Task 08: Build Business Profile Admin UI

## Overview

Develop the administrative frontend interface for creating and editing the
profiles of local businesses and service providers that participate in the
benefits club.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- MUST build a form for administrators to input company name, CNPJ, category, and upload a logo.
- MUST provide a data table view listing all registered businesses with actions to edit or disable them.
</requirements>

## Subtasks

- [x] 8.1 Create the admin business management route.
- [x] 8.2 Build a list/table displaying current businesses.
- [x] 8.3 Build the creation/edit form in an Island.
- [x] 8.4 Integrate the UI with the `GET` and `POST /api/businesses` endpoints.

## Implementation Details

Use shadcn/ui components. Keep the form simple. The `category` should probably
be a dropdown (Casa, Corpo, Alimentação, Esporte, etc) based on the PRD.

### Relevant Files

- `routes/admin/businesses.tsx`
- `islands/BusinessManager.tsx`

### Dependent Files

- None.

### Related ADRs

- None.

## Deliverables

- Working admin business management UI.
- Unit tests with 80%+ coverage **(REQUIRED)**
- Integration tests for UI rendering **(REQUIRED)**

## Tests

- Unit tests:
  - [x] Form validates required fields (CNPJ, Name, Category).
- Integration tests:
  - [x] Form submission triggers the correct API endpoint and refreshes the
        list.
- Test coverage target: >=80%
- All tests must pass

## Success Criteria

- All tests passing
- Test coverage >=80%
- Business catalog can be populated without using raw API requests.
