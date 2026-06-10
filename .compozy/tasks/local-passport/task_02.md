---
status: pending
title: Self-service business registration endpoint
type: backend
complexity: medium
dependencies:
  - task_01
---

# Task 02: Self-service business registration endpoint

## Overview

Create `POST /api/businesses/register` — a self-service endpoint that allows business owners to register themselves without admin intervention. The endpoint creates both a user account (with `role=business`) and a business record (with `isActive=false`). Admins later enable the business via the toggle in Task 04.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- MUST create new route `POST /api/businesses/register` that accepts multipart form data
- MUST accept fields: name, companyName, CNPJ, category, email, password, logo, description, socialLinks (instagram, facebook, whatsapp, menu), openingHours
- MUST validate all required fields using the validation from `lib/business.ts` (extended in Task 01)
- MUST create a user account via Better Auth with `role=business` and `status=pending` using the provided email and password
- MUST create a business record linked to the created user with `isActive: false`
- MUST return 201 with the business + user data on success
- MUST return 400 with descriptive error messages on validation failure
- MUST return 409 if email or CNPJ is already registered
- MUST NOT require authentication (the registration endpoint is public)
</requirements>

## Subtasks

- [ ] 2.1 Create `routes/api/businesses/register.ts` with multipart form handling
- [ ] 2.2 Implement user creation via Better Auth with `role=business`
- [ ] 2.3 Implement business record creation with `isActive=false`
- [ ] 2.4 Add duplicate email/CNPJ detection
- [ ] 2.5 Write unit and integration tests

## Implementation Details

This is a new file at `routes/api/businesses/register.ts`. Follow the existing registration pattern from `routes/api/users/register.ts` for multipart handling. The endpoint must be public (exempt from auth middleware — the path `/api/businesses/register` is not in the current exempt list, so update `_middleware.ts` or ensure the route itself does not depend on session).

See TechSpec "API Endpoints" table for the route signature and KV key structure.

### Relevant Files

- `routes/api/businesses/register.ts` — New self-service registration handler
- `routes/api/users/register.ts` — Existing resident registration pattern to follow
- `routes/_middleware.ts` — Add `/api/businesses/register` to the public exempt paths (line 17 pattern)
- `lib/business.ts` — Validation helpers (extended in Task 01)
- `lib/auth.ts` — Better Auth instance for user creation
- `lib/storage.ts` — Logo file upload

### Dependent Files

- `islands/BusinessManager.tsx` — No direct dependency; admins will manage businesses registered via this endpoint in the existing admin UI
- `routes/api/businesses/index.ts` — The existing admin POST endpoint remains separate; no conflict

### Related ADRs

- [ADR-002: Self-Service Business Registration with Admin Payment Gate](adrs/adr-002.md) — Core ADR defining self-service registration flow
- [ADR-004: Immediate Business Access with Feature Gating During Activation](adrs/adr-004.md) — Businesses get immediate login but catalog visibility requires admin toggle

## Deliverables

- New `routes/api/businesses/register.ts` route handler
- Updated `routes/_middleware.ts` with exempt path for the new public endpoint
- Tests covering validation, duplicate detection, success path, and error cases
- Test coverage >= 80% for new and modified files

## Tests

### Unit Tests

- [ ] Registration with missing required fields returns specific 400 errors
- [ ] Registration with invalid CNPJ returns 400
- [ ] Registration with duplicate email returns 409
- [ ] Registration with duplicate CNPJ returns 409
- [ ] Registration with valid data returns 201 with business record (isActive=false)
- [ ] Registration creates user with `role=business` and `status=pending`

### Integration Tests

- [ ] Full flow: register business → user exists with role business → business exists with isActive false
- [ ] Public endpoint: unauthenticated request succeeds (no session required)
- [ ] Logo upload error returns appropriate 400

## Success Criteria

- All tests passing
- Test coverage >= 80% for new files
- Manual test: `curl -F "name=..." -F "cnpj=..." ... http://localhost:8000/api/businesses/register` returns 201
