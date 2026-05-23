---
status: pending
title: Build User Registration API
type: backend
complexity: medium
dependencies:
  - task_01
  - task_02
---

# Task 03: Build User Registration API

## Overview

Develop the backend endpoint that receives resident registration data, uploads
identity documents to storage, and saves the user record in Deno KV with a
"pending" status.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- MUST handle `multipart/form-data` requests.
- MUST extract and save the photo ID and proof of residence using the local storage client implemented in `task_02`.
- MUST construct full document URLs by prefixing the saved filenames with `${APP_BASE_URL}/api/uploads/` (reading `APP_BASE_URL` from env variables) and store these absolute URLs in the user profile.
- MUST save the user profile in Deno KV with `status: 'pending'`.
- MUST create a secondary KV index mapping CPF to User ID.
- MUST create an entry in the pending approvals KV prefix.
</requirements>

## Subtasks

- [ ] 3.1 Create the API route `POST /api/users/register`.
- [ ] 3.2 Parse the multipart form data for fields (name, CPF, email) and files.
- [ ] 3.3 Validate the CPF format and uniqueness.
- [ ] 3.4 Upload files and get URLs.
- [ ] 3.5 Use `kv.atomic()` to save the user, CPF index, and pending approval
      entry simultaneously.

## Implementation Details

The CPF must be unique. The insertion must be atomic to ensure the user object,
the CPF index, and the pending approval queue are perfectly synchronized.

### Relevant Files

- `routes/api/users/register.ts` — To be created.
- `lib/storage.ts` — Used for uploads.

### Dependent Files

- None.

### Related ADRs

- [ADR-002: Backend API and Database Infrastructure](../adrs/adr-002.md)

## Deliverables

- Working registration API route.
- Deno KV persistence logic.
- Unit tests with 80%+ coverage **(REQUIRED)**
- Integration tests for registration flow **(REQUIRED)**

## Tests

- Unit tests:
  - [ ] Reject requests with missing files or fields.
  - [ ] Reject requests with a CPF that already exists.
- Integration tests:
  - [ ] Complete multipart request results in stored user and 2 uploaded files.
- Test coverage target: >=80%
- All tests must pass

## Success Criteria

- All tests passing
- Test coverage >=80%
- User is successfully created in KV with "pending" status, documents saved on
  disk, and full absolute URLs (using `APP_BASE_URL`) saved in the database user
  record.
