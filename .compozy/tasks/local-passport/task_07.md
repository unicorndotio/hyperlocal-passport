---
status: pending
title: Build Business Profile CRUD API
type: backend
complexity: medium
dependencies:
  - task_01
  - task_02
---

# Task 07: Build Business Profile CRUD API

## Overview
Create the backend endpoints for managing business partners within the platform. This enables administrators to register stores, restaurants, and service providers that will offer coupons to residents.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- MUST provide `POST /api/businesses` to create a new business profile and link it to an existing user account.
- MUST provide `GET /api/businesses` to list active businesses.
- MUST provide `PUT /api/businesses/:id` and `DELETE /api/businesses/:id` for management.
- MUST handle multipart upload for the business `logoUrl` via DigitalOcean Spaces.
</requirements>

## Subtasks
- [ ] 7.1 Implement the POST route to handle profile creation and logo upload.
- [ ] 7.2 Implement the GET route returning the list of businesses.
- [ ] 7.3 Implement PUT/DELETE routes for updates and soft deletion.
- [ ] 7.4 Save records to Deno KV using the `["businesses", "<business_id>"]` key structure.

## Implementation Details
Ensure that a business profile is strongly linked to a user account (`userId`), allowing that specific user to log in and manage their own business dashboard later.

### Relevant Files
- `routes/api/businesses/index.ts`
- `routes/api/businesses/[id].ts`

### Dependent Files
- None.

### Related ADRs
- [ADR-002: Backend API and Database Infrastructure](../adrs/adr-002.md)

## Deliverables
- CRUD API for businesses.
- Logo upload integration.
- Unit tests with 80%+ coverage **(REQUIRED)**
- Integration tests for business management **(REQUIRED)**

## Tests
- Unit tests:
  - [ ] Creating a business without a logo fails validation.
  - [ ] Fetching businesses returns the correct JSON array.
- Integration tests:
  - [ ] Admin can create, read, update, and delete a business profile.
- Test coverage target: >=80%
- All tests must pass

## Success Criteria
- All tests passing
- Test coverage >=80%
- Admins can fully manage the catalog of partners via API.
