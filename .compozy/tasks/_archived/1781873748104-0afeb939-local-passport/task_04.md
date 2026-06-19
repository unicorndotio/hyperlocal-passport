---
status: completed
title: Admin enable/disable business toggle
type: backend
complexity: low
dependencies:
  - task_02
---

# Task 04: Admin enable/disable business toggle

## Overview

Create `PUT /api/admin/businesses/[id]/toggle` — an admin-only endpoint that flips a business's `isActive` flag. This serves as the payment gate: only businesses with `isActive=true` appear in the public catalog. The toggle is the mechanism by which admins confirm payment has been received.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- MUST create new route `PUT /api/admin/businesses/[id]/toggle` accepting JSON body with `isActive: boolean`
- MUST require `admin` role authentication (the existing `/api/admin/*` middleware already enforces this)
- MUST return 200 with the updated business record
- MUST return 404 if the business does not exist
- MUST be a simple KV update (no cascading side effects)
</requirements>

## Subtasks

- [x] 4.1 Create `routes/api/admin/businesses/[id]/toggle.ts` route handler
- [x] 4.2 Implement the toggle logic (read business, flip isActive, save)
- [x] 4.3 Write unit and integration tests

## Implementation Details

The middleware in `routes/_middleware.ts:36-51` already restricts `/api/admin/*` paths to admin role. This route is straightforward — read the existing business record, update `isActive` to the requested value, and write back.

The existing `routes/api/businesses/[id].ts` already has a PUT handler that can toggle `isActive` (line 57-60), but that route requires admin ownership check on all `/api/businesses` write operations. A dedicated `/api/admin/businesses/[id]/toggle` endpoint provides a cleaner, single-purpose toggle for the admin panel.

### Relevant Files

- `routes/api/admin/businesses/[id]/toggle.ts` — New admin toggle handler
- `routes/api/admin/businesses.tsx` — Admin page that will call this toggle
- `lib/kv-adapter.ts` — KV adapter for reading/updating business records

### Dependent Files

- `routes/catalog.tsx` — Catalog already filters by `isActive` (line 19); toggling `isActive` here directly affects catalog visibility
- `islands/BusinessManager.tsx` — The existing admin island's `handleToggleActive` currently uses `PUT /api/businesses/[id]`; should be updated to use this new dedicated endpoint

### Related ADRs

- [ADR-002: Self-Service Business Registration with Admin Payment Gate](adrs/adr-002.md) — Defines admin enable/disable as the payment gate mechanism

## Deliverables

- New `routes/api/admin/businesses/[id]/toggle.ts` route handler
- Tests covering success, 404, and auth enforcement
- Test coverage >= 80% for new files
- (Optional but recommended) Update `islands/BusinessManager.tsx` to call the new toggle endpoint

## Tests

### Unit Tests

- [ ] Valid toggle request (isActive: true → false) returns 200
- [ ] Valid toggle request (isActive: false → true) returns 200
- [ ] Toggle for non-existent business returns 404
- [ ] Toggle with missing body field defaults to `!currentValue`

### Integration Tests

- [ ] Admin user toggles business → business isActive flipped in KV
- [ ] Non-admin user gets 403
- [ ] Unauthenticated request gets 401
- [ ] After toggling to inactive, business disappears from catalog response

## Success Criteria

- All tests passing
- Test coverage >= 80% for new files
- Toggle correctly controls catalog visibility
