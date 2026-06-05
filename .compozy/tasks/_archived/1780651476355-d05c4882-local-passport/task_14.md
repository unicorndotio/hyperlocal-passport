---
status: completed
title: Build Login & Authentication UI
type: frontend
complexity: medium
dependencies:
  - task_01
---

# Task 14: Build Login & Authentication UI

## Overview

Implement the login page and client-side authentication form to allow users (Admin, Business, Resident) to sign in to the platform using their email and password.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- MUST provide a login page at `/login`.
- MUST implement a `LoginForm` island with email and password fields.
- MUST use Better Auth client-side SDK for the authentication request.
- MUST handle and display authentication errors (e.g., invalid credentials).
- MUST redirect users to the appropriate dashboard upon successful login based on their role.
</requirements>

## Subtasks

- [x] 14.1 Create the login page route (`routes/login.tsx`).
- [x] 14.2 Build the `LoginForm` island with validation.
- [x] 14.3 Integrate Better Auth client for sign-in functionality.
- [x] 14.4 Implement post-login redirection logic (Admin to `/admin/approvals`, etc.).
- [x] 14.5 Add logout functionality (can be a simple button/link).

## Implementation Details

Use the Better Auth client to perform `signIn.email()`. Ensure the UI follows the existing design patterns (Tailwind CSS, Shadcn-like components).

### Relevant Files

- `routes/login.tsx` — Created.
- `islands/LoginForm.tsx` — Created.
- `lib/auth.ts` — Auth instance for client/server shared use.
- `routes/_middleware.ts` — Currently redirects to `/login` if unauthorized.

### Dependent Files

- `routes/_middleware.ts` — Relies on `/login` existing for redirects.

### Related ADRs

- [ADR-005: Authentication Strategy](adrs/adr-005.md)

## Deliverables

- Functional login page at `/login`.
- Responsive `LoginForm` island.
- Unit tests for the login form component.
- Integration tests for the login flow.
- Test coverage target: >=80%

## Tests

- Unit tests:
  - [x] `LoginForm` renders all required fields.
  - [x] `LoginForm` displays error message on failed authentication.
- Integration tests:
  - [x] Successful login redirects to the correct page.
  - [x] Logout clears the session and redirects to login.

## Success Criteria

- All tests passing.
- Test coverage >=80%.
- Users can successfully log in and are routed to their respective areas.
