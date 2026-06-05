---
status: completed
title: Build Admin Approvals API
type: backend
complexity: medium
dependencies:
  - task_01
---

# Task 05: Build Admin Approvals API

## Overview

Implement the backoffice API endpoints that allow administrators to fetch the
queue of pending resident registrations and approve or reject them.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- MUST provide `GET /api/admin/approvals/pending` to list users from the `["approvals", "pending", "<user_id>"]` keys.
- MUST provide `POST /api/admin/approvals/:userId` to update user status to `approved` or `rejected`.
- MUST use `kv.atomic()` to update the user status AND remove the pending queue entry simultaneously.
- MUST restrict these endpoints to users with the `admin` role.
</requirements>

## Subtasks

- [x] 5.1 Create the GET route to list pending approvals.
- [x] 5.2 Create the POST route to handle the approval/rejection action.
- [x] 5.3 Implement atomic KV operations to resolve the pending state.
- [x] 5.4 Ensure middleware protects the routes for admin access only.

## Implementation Details

Listing uses `kv.list({ prefix: ["approvals", "pending"] })`. For each pending
entry, fetch the user details to return in the API response.

### Relevant Files

- `routes/api/admin/approvals/pending.ts`
- `routes/api/admin/approvals/[userId].ts`

### Dependent Files

- None.

### Related ADRs

- [ADR-002: Backend API and Database Infrastructure](../adrs/adr-002.md)

## Deliverables

- Working admin API routes.
- Deno KV atomic status transitions.
- Unit tests with 80%+ coverage **(REQUIRED)**
- Integration tests for approval flow **(REQUIRED)**

## Tests

- Unit tests:
  - [x] Approving a user updates their status and removes them from the pending
        list.
  - [x] Rejecting a user updates their status and removes them from the pending
        list.
- Integration tests:
  - [x] Non-admin requests to these endpoints return 403 Forbidden.
- Test coverage target: >=80%
- All tests must pass

## Success Criteria

- All tests passing
- Test coverage >=80%
- Admins can securely process the pending user queue.
