---
status: completed
title: Admin Coupon Management
type: backend
complexity: medium
dependencies:
  - task_02
---

# Task 11: Admin Coupon Management

## Overview

Implement admin coupon management endpoints and UI for cross-business coupon CRUD. Admins need visibility into all coupons across all businesses with filtering, along with the ability to edit or delete any coupon. This is the admin coupon half of the original step 11 from TechSpec.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- `GET /api/admin/coupons` MUST list all coupons across all businesses with optional filters: businessId, status (isActive), and date range
- `PUT /api/admin/coupons/[id]` MUST allow updating any coupon regardless of business ownership
- `DELETE /api/admin/coupons/[id]` MUST allow deleting any coupon regardless of business ownership
- All admin coupon endpoints MUST require admin role (enforced by existing middleware)
- The AdminCoupons island MUST display all coupons in a table with business name, title, behavior type, status, and actions
- The admin UI MUST provide inline edit and delete functionality
- The `/admin/coupons` page route MUST render the AdminCoupons island
- Existing admin middleware at `routes/_middleware.ts` already protects `/admin/*` routes — leverage it
- All text MUST be in English per project convention

## Subtasks

- [x] 11.1 Implement `GET /api/admin/coupons` API handler with filtering and pagination
- [x] 11.2 Implement `PUT /api/admin/coupons/[id]` API handler for admin updates
- [x] 11.3 Implement `DELETE /api/admin/coupons/[id]` API handler for admin deletes
- [x] 11.4 Build AdminCoupons island with coupon table, filters, and inline actions
- [x] 11.5 Create `/admin/coupons` page route
- [x] 11.6 Write integration tests for admin coupon API endpoints

## Implementation Details

The admin coupon API handlers sit under `routes/api/admin/coupons/` following the existing admin API pattern (see `routes/api/admin/businesses/`, `routes/api/admin/signals/`).

The GET handler lists all coupons using `kv.list({ prefix: ['coupons'] })` with optional filter parameters. The PUT and DELETE handlers mirror the existing non-admin versions but without ownership checks.

The AdminCoupons island at `islands/AdminCoupons.tsx` (new) fetches from the admin API and renders a table with columns: business name, title, behavior type, status, created date, and action buttons.

The page route at `routes/admin/coupons.tsx` renders the AdminCoupons island. It's automatically protected by the existing `_middleware.ts` admin check.

### Relevant Files
- `routes/api/admin/coupons/index.ts` — New GET handler for listing coupons
- `routes/api/admin/coupons/[id].ts` — New PUT/DELETE handler
- `islands/AdminCoupons.tsx` — New admin island
- `routes/admin/coupons.tsx` — New page route
- `lib/coupon.ts` — Coupon type
- `middleware.ts` — Already protects /admin/* routes

### Dependent Files
- (none — self-contained admin module)

### Related ADRs
- ADR-001: Coupon Engine Architecture — Discriminated Union with Template Presets

## Deliverables

- `GET /api/admin/coupons` with filtering
- `PUT /api/admin/coupons/[id]` for admin updates
- `DELETE /api/admin/coupons/[id]` for admin deletes
- AdminCoupons island with table and inline actions
- `/admin/coupons` page route
- Integration tests with 80%+ coverage

## Tests

- Integration tests:
  - [x] GET `/api/admin/coupons` lists all coupons with correct shape
  - [x] GET with businessId filter returns only that business's coupons
  - [x] GET with status filter returns only active/inactive coupons
  - [x] PUT updates any coupon regardless of ownership
  - [x] DELETE removes any coupon regardless of ownership
  - [x] Unauthorized (non-admin) returns 403
- Component tests:
  - [ ] AdminCoupons renders coupon table with all columns
  - [ ] Inline edit updates coupon correctly
  - [ ] Inline delete removes coupon correctly
  - [ ] Filters update the displayed list
- Test coverage target: >=80%
- All tests must pass

## Success Criteria

- All tests passing
- Test coverage >=80%
- Admins can view, filter, edit, and delete any coupon from any business
- Admin API is properly protected by middleware
