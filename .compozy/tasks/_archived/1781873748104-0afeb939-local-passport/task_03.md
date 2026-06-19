---
status: completed
title: Business profile management API
type: backend
complexity: medium
dependencies:
  - task_02
---

# Task 03: Business profile management API

## Overview

Create `PUT /api/businesses/[id]/profile` — a self-service endpoint allowing business owners to update their own profile fields (logo, description, socialLinks, openingHours) after registration. The endpoint enforces ownership (the authenticated user must own the business) and validates all fields before persisting.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- MUST create new route `PUT /api/businesses/[id]/profile` accepting JSON body and optionally multipart for logo re-upload
- MUST verify the authenticated user's ID matches the business's `userId` (ownership check)
- MUST accept partial updates — only provided fields are changed
- MUST validate all provided fields using `lib/business.ts` validation helpers
- MUST persist updates to KV via the adapter
- MUST return 200 with the updated business record
- MUST return 403 if the authenticated user is not the business owner
- MUST return 404 if the business does not exist
- MUST require authentication with `business` or `admin` role
</requirements>

## Subtasks

- [x] 3.1 Create `routes/api/businesses/[id]/profile.ts` route handler
- [x] 3.2 Implement ownership check (compare session user ID to business's userId)
- [x] 3.3 Implement partial update logic with field validation
- [x] 3.4 Handle logo re-upload in multipart mode
- [x] 3.5 Write unit and integration tests

## Implementation Details

This route should combine JSON body parsing (for text fields like socialLinks and openingHours) with optional multipart handling (for logo re-upload). Follow the existing `PUT /api/businesses/[id]` pattern in `routes/api/businesses/[id].ts` but add the ownership gate.

The TechSpec middleware already restricts `/api/businesses/*` POST/PUT/DELETE to admin only (see `routes/_middleware.ts:38-40`). This new route `/api/businesses/[id]/profile` must be exempted from that admin-only check — it should be accessible to the owning business user and admins. Update `_middleware.ts` accordingly.

### Relevant Files

- `routes/api/businesses/[id]/profile.ts` — New profile update handler
- `routes/api/businesses/[id].ts` — Existing admin business update pattern to reference
- `routes/_middleware.ts` — Exempt `/api/businesses/[id]/profile` from admin-only check, allow business+admin
- `lib/business.ts` — Validation helpers
- `lib/storage.ts` — Logo file upload for re-upload

### Dependent Files

- `islands/BusinessManager.tsx` — Not affected (this is the admin panel, not self-service)
- New business profile editor island (Task 05) — Will consume this endpoint

### Related ADRs

- [ADR-004: Immediate Business Access with Feature Gating During Activation](adrs/adr-004.md) — Businesses can manage profiles before admin activation (coupon CRUD is independent of isActive)

## Deliverables

- New `routes/api/businesses/[id]/profile.ts` route handler
- Updated `routes/_middleware.ts` with role exception for business owners
- Tests covering ownership enforcement, validation, partial updates, and error cases
- Test coverage >= 80% for new and modified files

## Tests

### Unit Tests

- [x] Profile update with unmatched userId returns 403
- [x] Profile update for non-existent business returns 404
- [x] Profile update with invalid openingHours returns 400
- [x] Profile update with invalid socialLinks URL returns 400
- [x] Profile partial update — only provided fields change, others remain

### Integration Tests

- [x] Business user authenticates and updates own profile (logo + fields) → 200
- [x] Admin updates any business profile → 200
- [x] Unauthenticated request returns 401
- [x] Another business user updates not-their-business → 403

## Success Criteria

- All tests passing
- Test coverage >= 80% for new files
- Ownership check correctly prevents unauthorized updates
