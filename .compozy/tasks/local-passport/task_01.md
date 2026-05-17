---
status: pending
title: Setup Better Auth and Deno KV Adapter
type: backend
complexity: medium
dependencies: []
---

# Task 01: Setup Better Auth and Deno KV Adapter

## Overview
This task sets up the fundamental authentication layer for the application using Better Auth and Deno KV. It ensures all three user roles (Admin, Business, Resident) can log in and manage secure sessions.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- MUST configure Better Auth middleware in Deno Fresh.
- MUST implement or configure a database adapter allowing Better Auth to read/write sessions and users in Deno KV.
- MUST support authentication for different roles (`resident`, `business`, `admin`).
</requirements>

## Subtasks
- [ ] 1.1 Install Better Auth and configure the primary auth instance.
- [ ] 1.2 Setup the database adapter pointing to `Deno.openKv()`.
- [ ] 1.3 Add Deno Fresh middleware to protect `/api/*` and private UI routes.
- [ ] 1.4 Create a basic login/logout API or let Better Auth handle the endpoints automatically.

## Implementation Details
Configure the Better Auth handler. Refer to the TechSpec Data Models to ensure the user ID structure aligns with `["users", "<user_id>"]` keys or adapt as needed for Better Auth's standard schema.

### Relevant Files
- `deno.json` — Add Better Auth dependencies.
- `routes/_middleware.ts` — Inject auth protection.
- `main.ts` — Register plugins if necessary.

### Dependent Files
- `routes/api/*` — Will depend on auth context.

### Related ADRs
- [ADR-002: Backend API and Database Infrastructure](../adrs/adr-002.md)
- [ADR-005: Authentication Strategy](../adrs/adr-005.md)

## Deliverables
- Better Auth integration code working with Deno KV.
- Protected route middleware.
- Unit tests with 80%+ coverage **(REQUIRED)**
- Integration tests for auth flow **(REQUIRED)**

## Tests
- Unit tests:
  - [ ] Valid credentials generate a valid session cookie.
  - [ ] Invalid credentials return appropriate error.
- Integration tests:
  - [ ] Accessing protected route without session returns 401/redirect.
  - [ ] Accessing protected route with session allows access.
- Test coverage target: >=80%
- All tests must pass

## Success Criteria
- All tests passing
- Test coverage >=80%
- Able to programmatically create a user and authenticate via API.
